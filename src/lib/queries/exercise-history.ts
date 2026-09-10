import { prisma } from "@/lib/prisma";

export type PreviousSet = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
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
        select: { setNumber: true, actualWeight: true, actualReps: true },
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
