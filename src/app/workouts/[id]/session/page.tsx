import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { getExerciseHistoryForExercises } from "@/lib/queries/exercise-history";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { SessionTracker, type SessionTrackerGroup } from "@/components/sessions/session-tracker";

// Aperçu du modèle avant toute séance réelle : aucune écriture en base ici.
// La séance n'est créée que lorsqu'une série est renseignée (voir src/lib/actions/sessions.ts).
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

  const groups: SessionTrackerGroup[] = template.exercises.map((workoutExercise, exerciseOrder) => ({
    exerciseId: workoutExercise.exerciseId,
    exerciseOrder,
    exercise: workoutExercise.exercise,
    sets: [],
  }));

  if (groups.length === 0) {
    return (
      <>
        <PageHeader backHref={`/workouts/${template.id}`} />
        <Container>
          <h1 className="text-2xl font-semibold">{template.name}</h1>
          <p className="mt-4 text-neutral-500">Aucun exercice dans cette séance.</p>
        </Container>
      </>
    );
  }

  const activeExerciseId =
    typeof requestedExerciseId === "string" && groups.some((g) => g.exerciseId === requestedExerciseId)
      ? requestedExerciseId
      : groups[0].exerciseId;

  const userId = await getCurrentUserId();
  const history = await getExerciseHistoryForExercises(
    userId,
    groups.map((g) => g.exerciseId)
  );

  return (
    <SessionTracker
      title={template.name}
      basePath={`/workouts/${template.id}/session`}
      backHref={`/workouts/${template.id}`}
      addSetArg={`v:${template.id}`}
      groups={groups}
      activeExerciseId={activeExerciseId}
      allowRemove={false}
      headerRight={<p className="text-xs text-neutral-400">Renseignez une série pour démarrer</p>}
      history={history}
    />
  );
}
