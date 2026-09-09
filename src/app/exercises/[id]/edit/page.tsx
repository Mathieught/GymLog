import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { updateExercise } from "@/lib/actions/exercises";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

export default async function EditExercisePage({
  params,
}: PageProps<"/exercises/[id]/edit">) {
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise || exercise.isArchived) notFound();

  return (
    <>
      <PageHeader backHref={`/exercises/${exercise.id}`} />
      <Container>
        <h1 className="mb-6 text-2xl font-semibold">Modifier {exercise.name}</h1>
        <ExerciseForm
          action={updateExercise.bind(null, exercise.id)}
          defaultValues={exercise}
          submitLabel="Enregistrer les modifications"
        />
      </Container>
    </>
  );
}
