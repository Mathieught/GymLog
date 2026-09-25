"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeExerciseId, type SessionRowGroup, type SessionRowSet } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { LibraryExercise, LocalSession, OutboxOp } from "@/lib/offline/types";
import { fetchExerciseHistory } from "@/lib/actions/exercises";
import {
  getLocalSession,
  getLocalSessions,
  getActiveLocalSessionForTemplate,
  putLocalSession,
  deleteLocalSession,
  getLocalHistory,
  putLocalHistory,
  enqueueOp,
  getOutbox,
  getLocalTemplates,
  replaceLocalTemplates,
  setMeta,
} from "@/lib/offline/db";
import { seedToLocalSession, reconcileLocalGroups } from "@/lib/offline/local-seed";
import { syncNow } from "@/lib/offline/sync";

export type SessionSeed = {
  sessionId: string | null;
  workoutTemplateId: string;
  templateName: string;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  // Bibliothèque d'exercices et variantes déjà faites à la place de chaque exercice du programme
  // (la plus récente d'abord) : de quoi choisir une variante en séance (voir VariantPicker).
  library: LibraryExercise[];
  substitutes: Record<string, string[]>;
  completedAt: string | null;
  // null tant qu'aucune séance n'existe encore (aperçu) — fixée par start() ("Commencer la
  // séance", chrono lancé sans rien créer) ou, à défaut, par addSet/logSet au moment même où ils
  // créent la séance locale, pour que le chrono (voir SessionTimer) parte du bon instant.
  startedAt: string | null;
};

type EngineState = {
  sessionId: string | null;
  completedAt: string | null;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  // Celle du seed, plus les variantes créées pendant la séance.
  library: LibraryExercise[];
  startedAt: string | null;
  // Nombre de séries supprimées cette séance, par exercice (voir buildSessionRows) : chaque
  // suppression réduit d'autant le nombre de suggestions encore proposées au-delà des séries
  // réelles, pour qu'une série supprimée ne réapparaisse jamais grisée comme si de rien n'était —
  // sans pour autant masquer les AUTRES séries encore jamais touchées d'un même exercice (ex. un
  // exercice à 3 séries cibles : valider la 1ère ne doit pas faire disparaître les 2 suivantes).
  removedSetCounts: Record<string, number>;
};

type MutationResult = { next: EngineState; ops: OutboxOp[]; sessionId: string | null } | null;

// Le moteur de séance côté client : la vérité vit dans l'état React + IndexedDB dès la première
// interaction, jamais en attente d'un aller-retour réseau. Chaque mutation met à jour l'état
// immédiatement, écrit dans IndexedDB, et pousse une opération dans la file de synchronisation
// (voir src/lib/offline/sync.ts) — rejouée dès que le réseau est là.
const hasValidatedSet = (sets: { completed: boolean }[]) => sets.some((s) => s.completed);

// Exercice réellement fait par la prochaine série d'un groupe (sa variante s'il en a une), et
// l'exercice du programme qu'il remplace le cas échéant.
function nextSetExercise(group: SessionRowGroup | undefined, slotExerciseId: string) {
  const actual = group ? activeExerciseId(group) : slotExerciseId;
  return { actual, substituteForId: actual === slotExerciseId ? null : slotExerciseId };
}

// Séance sans aucune série validée : elle n'a jamais vraiment existé — oubliée en local et supprimée
// sur le serveur (une série seulement ajoutée, ou validée puis annulée/supprimée, ne compte pas).
async function discardSession(sessionId: string) {
  await deleteLocalSession(sessionId);
  await enqueueOp({ type: "discardSession", sessionId });
  syncNow();
}

// "Terminer" hors du suivi de séance (page du programme, voir WorkoutProgramBody) : même règle que
// le bouton du suivi — sans aucune série validée, la séance est annulée plutôt que rangée, vide,
// dans l'historique.
export async function finishLocalSession(session: LocalSession) {
  if (!hasValidatedSet(session.sets)) return discardSession(session.id);
  await putLocalSession({ ...session, completedAt: new Date().toISOString(), updatedAt: Date.now() });
  await enqueueOp({ type: "completeSession", sessionId: session.id });
  syncNow();
}

// Annule les séances ouvertes sans série validée, sauf celle qu'on est encore en train de regarder
// (sa page de suivi ou la page de son programme) : "Commencer la séance" puis retour à l'accueil,
// ou vers n'importe quel autre onglet, = la séance n'a jamais existé.
export async function discardEmptySessions(pathname: string) {
  for (const session of await getLocalSessions()) {
    const stillInside =
      pathname === `/sessions/${session.id}` || pathname.startsWith(`/workouts/${session.workoutTemplateId}`);
    if (session.completedAt === null && !stillInside && !hasValidatedSet(session.sets)) {      await discardSession(session.id);
    }
  }
}

export function useSessionEngine(seed: SessionSeed) {
  const [state, setState] = useState<EngineState>(() => ({
    sessionId: seed.sessionId,
    completedAt: seed.completedAt,
    groups: seed.groups,
    history: seed.history,
    library: seed.library,
    startedAt: seed.startedAt,
    removedSetCounts: {},
  }));

  // Toujours la version la plus fraîche de l'état pour les handlers (évite les closures périmées
  // sans reconstruire un useCallback par render). Écrit uniquement en dehors du rendu (effet, ou
  // juste après un setState dans un handler) : jamais dans le corps du composant lui-même.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Réconciliation avec IndexedDB au montage : si une séance existante a des opérations en
  // attente de synchro, elle prime sur le rendu serveur (plus à jour) ; sinon on sème IndexedDB
  // depuis les props serveur pour permettre une future consultation hors ligne.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!seed.sessionId) {
        // Aperçu d'un programme : le serveur ne connaît aucune séance (normal, elle n'est créée
        // que localement au premier "addSet"/"logSet" — voir plus bas). Mais une séance locale
        // pour CE programme peut déjà exister si on revient sur cet aperçu après avoir commencé à
        // renseigner des séries (retour arrière, app fermée puis rouverte) : la reprendre plutôt
        // que de repartir d'un état vide, sinon tout ce qui a été renseigné semble perdu.
        const local = await getActiveLocalSessionForTemplate(seed.workoutTemplateId);
        if (cancelled || !local) return;
        setState({
          sessionId: local.id,
          completedAt: local.completedAt,
          groups: reconcileLocalGroups(local, seed.groups),
          history: seed.history,
          library: seed.library,
          startedAt: local.startedAt,
          removedSetCounts: {},
        });
        await Promise.all(
          Object.entries(seed.history).map(([exerciseId, performances]) =>
            putLocalHistory({ exerciseId, performances, updatedAt: Date.now() })
          )
        );
        await setMeta("activeSessionId", local.id);
        return;
      }
      const [local, outbox] = await Promise.all([getLocalSession(seed.sessionId), getOutbox()]);
      const hasPendingOpsForSession = outbox.some((entry) => {
        const op = entry.op;
        return "sessionId" in op && op.sessionId === seed.sessionId;
      });
      if (cancelled) return;
      if (local && hasPendingOpsForSession) {
        setState({
          sessionId: local.id,
          completedAt: local.completedAt,
          groups: reconcileLocalGroups(local, seed.groups),
          history: seed.history,
          library: seed.library,
          startedAt: local.startedAt,
          removedSetCounts: {},
        });
      } else {
        // updatedAt = dernière modification (fermeture auto, voir isOpen dans db.ts) : simplement
        // rouvrir la séance ne doit pas la repousser, on garde celle déjà connue.
        await putLocalSession({
          ...seedToLocalSession(seed, seed.sessionId),
          updatedAt: local?.updatedAt ?? Date.now(),
        });
      }
      await Promise.all(
        Object.entries(seed.history).map(([exerciseId, performances]) =>
          putLocalHistory({ exerciseId, performances, updatedAt: Date.now() })
        )
      );
      await setMeta("activeSessionId", seed.sessionId);
    })();
    return () => {
      cancelled = true;
    };
    // workoutTemplateId en plus de sessionId : passer d'un aperçu de programme jamais démarré à un
    // autre (les deux ont seed.sessionId === null) doit quand même redéclencher la recherche
    // d'une séance locale active, propre à CE programme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.sessionId, seed.workoutTemplateId]);

  const applyMutation = useCallback(
    async (compute: (current: EngineState) => MutationResult) => {
      // Une séance terminée est figée : le serveur refuse de toute façon ces mutations (voir
      // InvalidMutationError dans session-mutations.ts), mais on évite ici même l'aller-retour —
      // et l'illusion, via un rendu client en retard (cache, séance juste synchronisée), qu'une
      // modification a été prise en compte.
      if (stateRef.current.completedAt) return;

      const previousSessionId = stateRef.current.sessionId;
      const result = compute(stateRef.current);
      if (!result) return;
      const { next, ops, sessionId } = result;

      setState(next);
      stateRef.current = next;

      if (sessionId) {
        await putLocalSession(
          seedToLocalSession(
            { ...seed, sessionId, groups: next.groups, completedAt: next.completedAt, startedAt: next.startedAt },
            sessionId
          )
        );
        if (previousSessionId !== sessionId) {
          await setMeta("activeSessionId", sessionId);
        }
      }
      for (const op of ops) {
        await enqueueOp(op);
      }
      syncNow();
    },
    [seed]
  );

  const addSet = useCallback(
    (exerciseId: string, exerciseOrder: number) => {
      void applyMutation((current) => {
        const group = current.groups.find((g) => g.exerciseId === exerciseId);
        const setNumber = (group?.sets.at(-1)?.setNumber ?? 0) + 1;
        const setId = crypto.randomUUID();
        const isNewSession = current.sessionId === null;
        const sessionId = current.sessionId ?? crypto.randomUUID();
        const startedAt = current.startedAt ?? new Date().toISOString();

        const { actual, substituteForId } = nextSetExercise(group, exerciseId);

        const newSet: SessionRowSet = {
          id: setId,
          exerciseId: actual,
          setNumber,
          actualWeight: null,
          actualReps: null,
          completed: false,
          note: null,
        };

        const groups = current.groups.map((g) =>
          g.exerciseId === exerciseId ? { ...g, sets: [...g.sets, newSet] } : g
        );

        return {
          next: { ...current, sessionId, groups, startedAt },
          ops: [
            ...(isNewSession
              ? [{ type: "ensureSession" as const, sessionId, workoutTemplateId: seed.workoutTemplateId, name: seed.templateName, startedAt }]
              : []),
            { type: "addSet" as const, setId, sessionId, exerciseId: actual, exerciseOrder, setNumber, substituteForId },
          ],
          sessionId,
        };
      });
    },
    [applyMutation, seed.workoutTemplateId, seed.templateName]
  );

  const logSet = useCallback(
    (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => {
      void applyMutation((current) => {
        const group = current.groups.find((g) => g.exerciseId === exerciseId);
        const setNumber = (group?.sets.at(-1)?.setNumber ?? 0) + 1;
        const setId = crypto.randomUUID();
        const isNewSession = current.sessionId === null;
        const sessionId = current.sessionId ?? crypto.randomUUID();
        const startedAt = current.startedAt ?? new Date().toISOString();

        const { actual, substituteForId } = nextSetExercise(group, exerciseId);

        const newSet: SessionRowSet = { id: setId, exerciseId: actual, setNumber, actualWeight, actualReps, completed: true, note: null };
        const groups = current.groups.map((g) =>
          g.exerciseId === exerciseId ? { ...g, sets: [...g.sets, newSet] } : g
        );

        return {
          next: { ...current, sessionId, groups, startedAt },
          ops: [
            ...(isNewSession
              ? [{ type: "ensureSession" as const, sessionId, workoutTemplateId: seed.workoutTemplateId, name: seed.templateName, startedAt }]
              : []),
            {
              type: "logSet" as const,
              setId,
              sessionId,
              exerciseId: actual,
              exerciseOrder,
              setNumber,
              actualWeight,
              actualReps,
              substituteForId,
            },
          ],
          sessionId,
        };
      });
    },
    [applyMutation, seed.workoutTemplateId, seed.templateName]
  );

  const updateSet = useCallback(
    (setId: string, actualWeight: number, actualReps: number) => {
      void applyMutation((current) => {
        const groups = current.groups.map((g) => ({
          ...g,
          sets: g.sets.map((s) => (s.id === setId ? { ...s, actualWeight, actualReps, completed: true } : s)),
        }));
        return {
          next: { ...current, groups },
          ops: [{ type: "updateSet" as const, setId, actualWeight, actualReps, completed: true }],
          sessionId: current.sessionId,
        };
      });
    },
    [applyMutation]
  );

  // Annule le résultat d'une série déjà validée : redevient une série vierge (voir SetRow, qui
  // réaffiche alors la suggestion tirée de l'historique plutôt que 0×0), sans changer sa place ni
  // renuméroter les autres — à la différence de removeSet, qui retire vraiment la série de la liste.
  const resetSet = useCallback(
    (setId: string) => {
      void applyMutation((current) => {
        const groups = current.groups.map((g) => ({
          ...g,
          sets: g.sets.map((s) => (s.id === setId ? { ...s, actualWeight: null, actualReps: null, completed: false } : s)),
        }));
        return {
          next: { ...current, groups },
          ops: [{ type: "updateSet" as const, setId, actualWeight: null, actualReps: null, completed: false }],
          sessionId: current.sessionId,
        };
      });
    },
    [applyMutation]
  );

  // Note rapide sur une série de la séance en cours (voir SetRow) — même mécanique que les autres
  // mutations (état local + IndexedDB + file de synchro), aucune restriction supplémentaire.
  const updateNote = useCallback(
    (setId: string, note: string | null) => {
      void applyMutation((current) => {
        const groups = current.groups.map((g) => ({
          ...g,
          sets: g.sets.map((s) => (s.id === setId ? { ...s, note } : s)),
        }));
        return {
          next: { ...current, groups },
          ops: [{ type: "updateSetNote" as const, setId, note }],
          sessionId: current.sessionId,
        };
      });
    },
    [applyMutation]
  );

  // Note de l'exercice (voir la pastille de SessionTracker) : elle appartient à l'exercice, pas à
  // la séance — possible dès l'aperçu, et recopiée dans l'instantané des programmes pour rester
  // à jour dans une prochaine séance démarrée hors ligne.
  const updateExerciseNote = useCallback(
    (exerciseId: string, note: string | null) => {
      void applyMutation((current) => ({
        next: {
          ...current,
          groups: current.groups.map((g) =>
            g.exerciseId === exerciseId ? { ...g, exercise: { ...g.exercise, description: note } } : g
          ),
          // Note d'une variante : elle vit dans la bibliothèque, pas dans les groupes.
          library: current.library.map((e) => (e.id === exerciseId ? { ...e, description: note } : e)),
        },
        ops: [{ type: "updateExerciseNote" as const, exerciseId, note }],
        sessionId: current.sessionId,
      }));
      void (async () => {
        const templates = await getLocalTemplates();
        await replaceLocalTemplates(
          templates.map((t) => ({
            ...t,
            exercises: t.exercises.map((e) =>
              e.exerciseId === exerciseId ? { ...e, exercise: { ...e.exercise, description: note } } : e
            ),
          }))
        );
      })();
    },
    [applyMutation]
  );

  // Variante (mode Avancé) : les séries pas encore validées de cet exercice du programme passent sur
  // `target` (null = retour à l'exercice prévu) ; celles déjà faites restent où elles ont été faites.
  // `created` : variante créée à l'instant, enregistrée par la même file de synchro que le reste —
  // donc aussi hors ligne, avant les séries qui la référencent.
  const switchExercise = useCallback(
    (slotExerciseId: string, target: LibraryExercise | null, created = false) => {
      void applyMutation((current) => {
        const targetId = target?.id ?? slotExerciseId;
        const groups = current.groups.map((g) =>
          g.exerciseId === slotExerciseId
            ? {
                ...g,
                variantId: target?.id ?? null,
                sets: g.sets.map((s) => (s.completed ? s : { ...s, exerciseId: targetId })),
              }
            : g
        );
        const library = created && target ? [...current.library, target] : current.library;
        if (created) void setMeta("library", library);
        return {
          next: { ...current, groups, library },
          ops: [
            ...(created && target
              ? [
                  {
                    type: "createExercise" as const,
                    exerciseId: target.id,
                    name: target.name,
                    muscle: target.muscle,
                    targetSets: target.targetSets || null,
                  },
                ]
              : []),
            ...(current.sessionId
              ? [{ type: "switchExercise" as const, sessionId: current.sessionId, slotExerciseId, exerciseId: targetId }]
              : []),
          ],
          sessionId: current.sessionId,
        };
      });
    },
    [applyMutation]
  );

  // Historique des variantes pas encore connu (choisie à l'instant, ou reprise hors ligne) : cache
  // local d'abord, sinon le serveur. Sans réseau ni cache, la variante part sans pré-remplissage.
  useEffect(() => {
    const missing = [
      ...new Set(state.groups.flatMap((g) => [activeExerciseId(g), ...g.sets.map((s) => s.exerciseId)])),
    ].filter((id) => !(id in state.history));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const local = await getLocalHistory(missing);
      const found: Record<string, PreviousPerformance[]> = {};
      for (const id of missing) {
        const cached = local.get(id);
        if (cached) {
          found[id] = cached.performances;
          continue;
        }
        try {
          found[id] = await fetchExerciseHistory(id, state.sessionId ?? undefined);
          await putLocalHistory({ exerciseId: id, performances: found[id], updatedAt: Date.now() });
        } catch {
          found[id] = [];
        }
      }
      if (!cancelled) setState((current) => ({ ...current, history: { ...found, ...current.history } }));
    })();
    return () => {
      cancelled = true;
    };
  }, [state.groups, state.history, state.sessionId]);

  const removeSet = useCallback(
    (setId: string) => {
      void applyMutation((current) => {
        const owningGroup = current.groups.find((g) => g.sets.some((s) => s.id === setId));
        if (!owningGroup || !current.sessionId) return null;

        const groups = current.groups.map((g) =>
          g.exerciseId === owningGroup.exerciseId
            ? {
                ...g,
                sets: g.sets
                  .filter((s) => s.id !== setId)
                  .map((s, index) => ({ ...s, setNumber: index + 1 })),
              }
            : g
        );
        const removedSetCounts = {
          ...current.removedSetCounts,
          [owningGroup.exerciseId]: (current.removedSetCounts[owningGroup.exerciseId] ?? 0) + 1,
        };

        return {
          next: { ...current, groups, removedSetCounts },
          ops: [{ type: "removeSet" as const, setId, sessionId: current.sessionId, exerciseId: owningGroup.exerciseId }],
          sessionId: current.sessionId,
        };
      });
    },
    [applyMutation]
  );

  // Retire une série seulement suggérée (jamais enregistrée) — celle-là précisément, pas la
  // dernière : son numéro source rejoint skippedSuggestions (voir buildSessionRows) et les
  // suggestions suivantes remontent avec leurs propres valeurs. Rien à synchroniser, donc possible
  // dès l'aperçu sans démarrer la séance.
  const dismissSuggestion = useCallback(
    (exerciseId: string, sourceSetNumber: number) => {
      void applyMutation((current) => ({
        next: {
          ...current,
          groups: current.groups.map((g) =>
            g.exerciseId === exerciseId
              ? { ...g, skippedSuggestions: [...(g.skippedSuggestions ?? []), sourceSetNumber] }
              : g
          ),
        },
        ops: [],
        sessionId: current.sessionId,
      }));
    },
    [applyMutation]
  );

  // "Commencer la séance" : la séance est créée tout de suite (chrono lancé), sans attendre la
  // première série. Tant qu'aucune série n'est validée, elle reste annulable : voir
  // discardEmptySessions, appelé quand on quitte la séance et son programme.
  const start = useCallback(() => {
    void applyMutation((current) => {
      if (current.sessionId) return null;
      const sessionId = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      return {
        next: { ...current, sessionId, startedAt },
        ops: [
          { type: "ensureSession" as const, sessionId, workoutTemplateId: seed.workoutTemplateId, name: seed.templateName, startedAt },
        ],
        sessionId,
      };
    });
  }, [applyMutation, seed.workoutTemplateId, seed.templateName]);

  // "Terminer" sans aucune série validée : la séance est annulée plutôt que rangée, vide, dans
  // l'historique. Renvoie true si c'est le cas.
  const discardIfEmpty = useCallback(() => {
    const current = stateRef.current;
    if (!current.sessionId || current.completedAt || hasValidatedSet(current.groups.flatMap((g) => g.sets))) {
      return false;
    }
    const next = { ...current, sessionId: null, startedAt: null };
    setState(next);
    stateRef.current = next;
    void discardSession(current.sessionId);
    return true;
  }, []);

  const completeSession = useCallback(() => {
    void applyMutation((current) => {
      if (!current.sessionId) return null;
      const completedAt = new Date().toISOString();
      return {
        next: { ...current, completedAt },
        ops: [{ type: "completeSession" as const, sessionId: current.sessionId }],
        sessionId: current.sessionId,
      };
    });
  }, [applyMutation]);

  return {
    sessionId: state.sessionId,
    completedAt: state.completedAt,
    groups: state.groups,
    history: state.history,
    library: state.library,
    startedAt: state.startedAt,
    removedSetCounts: state.removedSetCounts,
    switchExercise,
    addSet,
    logSet,
    updateSet,
    updateNote,
    updateExerciseNote,
    resetSet,
    removeSet,
    dismissSuggestion,
    start,
    discardIfEmpty,
    completeSession,
  };
}
