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
  const { exercise: requestedExerciseId } = await searchParams;

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
    exercise: workoutExercise.exercise,
    sets: [],
  }));

  const activeExerciseId =
    typeof requestedExerciseId === "string" && groups.some((g) => g.exerciseId === requestedExerciseId)
      ? requestedExerciseId
      : (groups[0]?.exerciseId ?? "");

  const userId = await getCurrentUserId();
  const history = await getExerciseHistoryForExercises(
    userId,
    groups.map((g) => g.exerciseId)
  );

  const seed: SessionSeed = {
    sessionId: null,
    workoutTemplateId: template.id,
    templateName: template.name,
    groups,
    history,
    completedAt: null,
  };

  return (
    <SessionTracker
      backHref={`/workouts/${template.id}`}
      seed={seed}
      activeExerciseId={activeExerciseId}
      allowRemove={false}
    />
  );
}
