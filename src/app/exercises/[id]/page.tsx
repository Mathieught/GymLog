import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { archiveExercise } from "@/lib/actions/exercises";

export default async function ExerciseDetailPage({
  params,
}: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise || exercise.isArchived) notFound();

  return (
    <>
      <PageHeader backHref="/exercises" />
      <Container>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{exercise.name}</h1>
            <p className="text-neutral-500">{exercise.muscle}</p>
          </div>
          <ButtonLink href={`/exercises/${exercise.id}/edit`} variant="secondary" size="sm">
            Modifier
          </ButtonLink>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Objectif actuel</p>
          <p className="text-lg font-medium">
            {exercise.targetWeight} kg × {exercise.targetReps} reps
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
