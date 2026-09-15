import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { updateExercise } from "@/lib/actions/exercises";

export default async function EditExercisePage({
  params,
}: PageProps<"/exercises/[id]/edit">) {
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise || exercise.isArchived) notFound();

  return (
    <ExerciseForm
      action={updateExercise.bind(null, exercise.id)}
      backHref={`/exercises/${exercise.id}`}
      title={`Modifier ${exercise.name}`}
      defaultValues={exercise}
    />
  );
}
