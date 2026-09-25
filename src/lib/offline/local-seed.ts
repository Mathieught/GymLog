import { variantOfSlot, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { LibraryExercise, LocalSession, TemplateSnapshot } from "@/lib/offline/types";
import { getLocalHistory, getMeta } from "@/lib/offline/db";
import type { SessionSeed } from "@/lib/offline/session-engine";

export function seedToLocalSession(seed: SessionSeed, sessionId: string): LocalSession {
  return {
    id: sessionId,
    workoutTemplateId: seed.workoutTemplateId,
    name: seed.templateName,
    completedAt: seed.completedAt,
    startedAt: seed.startedAt,
    exercises: seed.groups.map((g) => ({
      exerciseId: g.exerciseId,
      exerciseOrder: g.exerciseOrder,
      exercise: g.exercise,
    })),
    sets: seed.groups.flatMap((g) =>
      g.sets.map((s) => ({
        ...s,
        workoutSessionId: sessionId,
        exerciseOrder: g.exerciseOrder,
        substituteForId: s.exerciseId === g.exerciseId ? null : g.exerciseId,
      }))
    ),
    // Pour chaque groupe, y compris un retour à l'exercice prévu : sinon la dernière série, faite sur
    // la variante, la ferait réapparaître à la reprise (voir variantOfSlot).
    variants: Object.fromEntries(seed.groups.map((g) => [g.exerciseId, g.variantId ?? g.exerciseId])),
    updatedAt: Date.now(),
  };
}

// Séries rangées à la place d'un exercice du programme : les siennes et celles de ses variantes.
const setsOfSlot = (local: LocalSession, slotExerciseId: string) =>
  local.sets
    .filter((s) => (s.substituteForId ?? s.exerciseId) === slotExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber);


export function localSessionToGroups(local: LocalSession): SessionRowGroup[] {
  return local.exercises
    .slice()
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    .map((e) => {
      const sets = setsOfSlot(local, e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseOrder: e.exerciseOrder,
        exercise: e.exercise,
        sets,
        variantId: variantOfSlot(sets, e.exerciseId, local.variants?.[e.exerciseId]),
      };
    });
}

// `local.exercises` est un instantané figé au démarrage de la séance (voir LocalSession) : si le
// programme a gagné un exercice depuis (édité dans un autre onglet pendant la séance), la reprise
// depuis IndexedDB seule le fait disparaître — visible dans le rendu serveur (`seedGroups`, relu à
// chaque navigation), absent d'IndexedDB, donc plus rien ne s'aligne pour lui une fois qu'on revient
// dans la séance. On repart donc de la liste d'exercices la plus fraîche (`seedGroups`) et on n'y
// réinjecte que les séries locales, seules à pouvoir être en avance sur le serveur (pas encore
// synchronisées).
export function reconcileLocalGroups(local: LocalSession, seedGroups: SessionRowGroup[]): SessionRowGroup[] {
  const localExerciseIds = new Set(local.exercises.map((e) => e.exerciseId));
  return seedGroups.map((g) => {
    // Exercice pas encore vu localement (ajouté au programme depuis) : rien à réconcilier, on
    // garde tel quel les séries du serveur (vides, puisque personne n'a encore pu y toucher).
    if (!localExerciseIds.has(g.exerciseId)) return g;
    const localSets = setsOfSlot(local, g.exerciseId);
    return { ...g, sets: localSets, variantId: variantOfSlot(localSets, g.exerciseId, local.variants?.[g.exerciseId]) };
  });
}

// Reconstruit un seed complet (pour SessionTracker) à partir d'une séance IndexedDB seule —
// utilisé par la page de secours /~offline, quand aucun rendu serveur n'est disponible.
export async function localSessionToSeed(local: LocalSession): Promise<SessionSeed> {
  const groups = localSessionToGroups(local);
  // Variantes comprises : leurs séries et suggestions ont leur propre historique.
  const exerciseIds = new Set([
    ...groups.flatMap((g) => [g.exerciseId, g.variantId ?? g.exerciseId]),
    ...local.sets.map((s) => s.exerciseId),
  ]);
  const historyMap = await getLocalHistory([...exerciseIds]);
  const history: Record<string, PreviousPerformance[]> = {};
  for (const [id, entry] of historyMap) history[id] = entry.performances;

  return {
    sessionId: local.id,
    workoutTemplateId: local.workoutTemplateId,
    templateName: local.name,
    groups,
    history,
    library: (await getMeta<LibraryExercise[]>("library")) ?? [],
    substitutes: {},
    completedAt: local.completedAt,
    startedAt: local.startedAt,
  };
}

// Aperçu (aucune séance démarrée) construit à partir d'un programme mis en cache par
// src/lib/offline/snapshot.ts — permet de démarrer une séance hors ligne depuis /~offline même
// pour un programme dont la page d'aperçu n'a jamais été ouverte individuellement.
export function templateSnapshotToSeed(template: TemplateSnapshot, library: LibraryExercise[]): SessionSeed {
  return {
    sessionId: null,
    workoutTemplateId: template.id,
    templateName: template.name,
    groups: template.exercises
      .slice()
      .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
      .map((e) => ({
        exerciseId: e.exerciseId,
        exerciseOrder: e.exerciseOrder,
        exercise: e.exercise,
        sets: [],
      })),
    history: {},
    library,
    substitutes: {},
    completedAt: null,
    startedAt: null,
  };
}
