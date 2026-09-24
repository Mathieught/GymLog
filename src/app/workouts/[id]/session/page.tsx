import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { getExerciseHistoryForExercises } from "@/lib/queries/exercise-history";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import type { SessionRowGroup } from "@/lib/session-rows";

// Aperçu du modèle avant toute séance réelle : aucune écriture en base ici.
// La séance n'est créée (localement, puis synchronisée) qu'à la première série renseignée — voir
// src/lib/offline/session-engine.ts.
export default async function WorkoutTemplateSessionPreviewPage({
  params,
  searchParams,
}: PageProps<"/workouts/[id]/session">) {
  const { id } = await params;
  const { exercise: requestedExerciseId, start } = await searchParams;

  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
    },
  });
  if (!template || template.isArchived) notFound();

  const groups: SessionRowGroup[] = template.exercises.map((workoutExercise, exerciseOrder) => ({
    exerciseId: workoutExercise.exerciseId,
    exerciseOrder,
    // Nombre de séries figé dans la séance (voir WorkoutExercise.targetSets), pas celui de l'exercice.
    exercise: { ...workoutExercise.exercise, targetSets: workoutExercise.targetSets },
    sets: [],
  }));

  const activeExerciseId =
    typeof requestedExerciseId === "string" && groups.some((g) => g.exerciseId === requestedExerciseId)
      ? requestedExerciseId
      : (groups[0]?.exerciseId ?? "");

  const userId = await getCurrentUserId();
  const [history, previousSession] = await Promise.all([
    getExerciseHistoryForExercises(
      userId,
      groups.map((g) => g.exerciseId)
    ),
    // Aucune séance jamais créée = nouvel utilisateur : lui seul voit le bandeau d'amorce.
    prisma.workoutSession.findFirst({ where: { userId }, select: { id: true } }),
  ]);

  const seed: SessionSeed = {
    sessionId: null,
    workoutTemplateId: template.id,
    templateName: template.name,
    groups,
    history,
    completedAt: null,
    startedAt: null,
  };

  return (
    <SessionTracker
      backHref={`/workouts/${template.id}`}
      backLabel={template.name}
      seed={seed}
      activeExerciseId={activeExerciseId}
      showStartHint={!previousSession}
      startOnMount={start === "1"}
    />
  );
}
