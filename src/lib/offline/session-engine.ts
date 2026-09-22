"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionRowGroup, SessionRowSet } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { OutboxOp } from "@/lib/offline/types";
import {
  getLocalSession,
  getActiveLocalSessionForTemplate,
  putLocalSession,
  putLocalHistory,
  enqueueOp,
  getOutbox,
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
  completedAt: string | null;
  // null tant qu'aucune séance n'existe encore (aperçu) — voir addSet/logSet, qui la fixent au
  // moment même où ils créent la séance locale, pour que le chrono (voir SessionTimer) démarre
  // pile à la première série plutôt qu'à un chargement de page ultérieur.
  startedAt: string | null;
};

type EngineState = {
  sessionId: string | null;
  completedAt: string | null;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
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
export function useSessionEngine(seed: SessionSeed) {
  const [state, setState] = useState<EngineState>(() => ({
    sessionId: seed.sessionId,
    completedAt: seed.completedAt,
    groups: seed.groups,
    history: seed.history,
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
          startedAt: local.startedAt,
          removedSetCounts: {},
        });
      } else {
        await putLocalSession(seedToLocalSession(seed, seed.sessionId));
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

        const newSet: SessionRowSet = {
          id: setId,
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
              ? [{ type: "ensureSession" as const, sessionId, workoutTemplateId: seed.workoutTemplateId, name: seed.templateName }]
              : []),
            { type: "addSet" as const, setId, sessionId, exerciseId, exerciseOrder, setNumber },
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

        const newSet: SessionRowSet = { id: setId, setNumber, actualWeight, actualReps, completed: true, note: null };
        const groups = current.groups.map((g) =>
          g.exerciseId === exerciseId ? { ...g, sets: [...g.sets, newSet] } : g
        );

        return {
          next: { ...current, sessionId, groups, startedAt },
          ops: [
            ...(isNewSession
              ? [{ type: "ensureSession" as const, sessionId, workoutTemplateId: seed.workoutTemplateId, name: seed.templateName }]
              : []),
            { type: "logSet" as const, setId, sessionId, exerciseId, exerciseOrder, setNumber, actualWeight, actualReps },
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
    startedAt: state.startedAt,
    removedSetCounts: state.removedSetCounts,
    addSet,
    logSet,
    updateSet,
    updateNote,
    resetSet,
    removeSet,
    completeSession,
  };
}
