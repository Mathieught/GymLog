import type { SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { LocalSession, TemplateSnapshot } from "@/lib/offline/types";
import { getLocalHistory } from "@/lib/offline/db";
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
      g.sets.map((s) => ({ ...s, workoutSessionId: sessionId, exerciseId: g.exerciseId, exerciseOrder: g.exerciseOrder }))
    ),
    updatedAt: Date.now(),
  };
}

export function localSessionToGroups(local: LocalSession): SessionRowGroup[] {
  return local.exercises
    .slice()
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    .map((e) => ({
      exerciseId: e.exerciseId,
      exerciseOrder: e.exerciseOrder,
      exercise: e.exercise,
      sets: local.sets
        .filter((s) => s.exerciseId === e.exerciseId)
        .sort((a, b) => a.setNumber - b.setNumber),
    }));
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
    const localSets = local.sets
      .filter((s) => s.exerciseId === g.exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
    return { ...g, sets: localSets };
  });
}

// Reconstruit un seed complet (pour SessionTracker) à partir d'une séance IndexedDB seule —
// utilisé par la page de secours /~offline, quand aucun rendu serveur n'est disponible.
export async function localSessionToSeed(local: LocalSession): Promise<SessionSeed> {
  const groups = localSessionToGroups(local);
  const historyMap = await getLocalHistory(groups.map((g) => g.exerciseId));
  const history: Record<string, PreviousPerformance[]> = {};
  for (const group of groups) {
    history[group.exerciseId] = historyMap.get(group.exerciseId)?.performances ?? [];
  }

  return {
    sessionId: local.id,
    workoutTemplateId: local.workoutTemplateId,
    templateName: local.name,
    groups,
    history,
    completedAt: local.completedAt,
    startedAt: local.startedAt,
  };
}

// Aperçu (aucune séance démarrée) construit à partir d'un programme mis en cache par
// src/lib/offline/snapshot.ts — permet de démarrer une séance hors ligne depuis /~offline même
// pour un programme dont la page d'aperçu n'a jamais été ouverte individuellement.
export function templateSnapshotToSeed(template: TemplateSnapshot): SessionSeed {
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
    completedAt: null,
    startedAt: null,
  };
}
