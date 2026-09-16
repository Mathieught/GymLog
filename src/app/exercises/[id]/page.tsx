import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { ExerciseEditTrigger } from "@/components/exercises/exercise-edit-trigger";
import { archiveExercise } from "@/lib/actions/exercises";

export default async function ExerciseDetailPage({
  params,
}: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise || exercise.isArchived) notFound();

  return (
    <>
      <PageHeader
        backHref="/exercises"
        title={exercise.name}
        right={
          <ExerciseEditTrigger
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            defaultValues={exercise}
          />
        }
      />
      <Container>
        <p className="mb-6 text-neutral-500">{exercise.muscle.join(", ")}</p>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Objectif actuel</p>
          <p className="text-lg font-medium">
            {exercise.targetSets} série{exercise.targetSets > 1 ? "s" : ""}
          </p>
          {exercise.description && (
            <p className="mt-3 text-sm text-neutral-600">{exercise.description}</p>
          )}
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          L&apos;historique des performances passées sur cet exercice apparaîtra ici une fois des
          séances enregistrées.
        </p>

        <form action={archiveExercise.bind(null, exercise.id)} className="mt-8">
          <ConfirmSubmitButton
            type="submit"
            variant="danger"
            size="sm"
            confirmMessage={`Supprimer "${exercise.name}" ? Il n'apparaîtra plus dans vos listes, mais l'historique existant sera conservé.`}
          >
            Supprimer l&apos;exercice
          </ConfirmSubmitButton>
        </form>
      </Container>
    </>
  );
}
