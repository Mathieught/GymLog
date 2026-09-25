import { prisma } from "@/lib/prisma";
import { getActiveExercises, toLibraryExercise } from "@/lib/queries/exercises";
import type { SessionRowGroup } from "@/lib/session-rows";

export type PreviousSet = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  note: string | null;
};

export type PreviousPerformance = {
  sessionDate: Date;
  sets: PreviousSet[];
};

const HISTORY_LIMIT = 3;

// Jusqu'aux `HISTORY_LIMIT` dernières séances (autre que la séance en cours) où cet exercice a
// été pratiqué, avec le détail de chaque série — utilisé pour le mini récap par série, l'affichage
// de l'historique et le pré-remplissage des nouvelles séries (basé sur la plus récente).
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  excludeSessionId?: string
): Promise<PreviousPerformance[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      sets: { some: { exerciseId } },
    },
    orderBy: { startedAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      startedAt: true,
      sets: {
        where: { exerciseId },
        orderBy: { setNumber: "asc" },
        select: { setNumber: true, actualWeight: true, actualReps: true, note: true },
      },
    },
  });

  return sessions.map((session) => ({ sessionDate: session.startedAt, sets: session.sets }));
}

// Même chose que getExerciseHistory, mais pour tous les exercices d'une séance en une seule
// vague de requêtes parallèles : évite un aller-retour base à chaque changement d'exercice
// (le carrousel de la séance a besoin de l'historique de tous les exercices dès le chargement).
export async function getExerciseHistoryForExercises(
  userId: string,
  exerciseIds: string[],
  excludeSessionId?: string
): Promise<Record<string, PreviousPerformance[]>> {
  const uniqueIds = [...new Set(exerciseIds)];
  const results = await Promise.all(
    uniqueIds.map((exerciseId) => getExerciseHistory(userId, exerciseId, excludeSessionId))
  );
  return Object.fromEntries(uniqueIds.map((exerciseId, i) => [exerciseId, results[i]]));
}

// Variantes déjà faites à la place de chaque exercice, la plus récente d'abord : proposées en tête
// du choix d'une variante (voir VariantPicker).
// ponytail: lit toutes les séries de variante de ces exercices ; à borner si elles se comptent en milliers.
async function getUsedSubstitutes(userId: string, slotExerciseIds: string[]) {
  const sets = await prisma.workoutSet.findMany({
    where: { substituteForId: { in: slotExerciseIds }, workoutSession: { userId } },
    orderBy: { workoutSession: { startedAt: "desc" } },
    select: { exerciseId: true, substituteForId: true },
  });
  const substitutes: Record<string, string[]> = {};
  for (const set of sets) {
    const list = (substitutes[set.substituteForId!] ??= []);
    if (!list.includes(set.exerciseId)) list.push(set.exerciseId);
  }
  return substitutes;
}

// Tout ce que le suivi de séance charge en plus des séries : historique des exercices du programme,
// de leurs variantes (déjà utilisées ou présentes dans la séance), et la bibliothèque d'exercices.
export async function getSessionExerciseData(userId: string, groups: SessionRowGroup[], excludeSessionId?: string) {
  const slotIds = groups.map((g) => g.exerciseId);
  const [substitutes, library] = await Promise.all([getUsedSubstitutes(userId, slotIds), getActiveExercises(userId)]);
  const history = await getExerciseHistoryForExercises(
    userId,
    [...slotIds, ...Object.values(substitutes).flat(), ...groups.flatMap((g) => g.sets.map((s) => s.exerciseId))],
    excludeSessionId
  );
  return { history, substitutes, library: library.map(toLibraryExercise) };
}
