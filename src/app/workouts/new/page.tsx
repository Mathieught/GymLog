import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutTemplateForm } from "@/components/workouts/workout-template-form";
import { createWorkoutTemplate } from "@/lib/actions/workout-templates";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

export default async function NewWorkoutPage() {
  const userId = await getCurrentUserId();
  const exercises = await prisma.exercise.findMany({
    where: { userId, isArchived: false },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader backHref="/workouts" />
      <Container>
        <h1 className="mb-6 text-2xl font-semibold">Nouvelle séance</h1>
        <WorkoutTemplateForm
          action={createWorkoutTemplate}
          exerciseOptions={exercises}
          exerciseNamesById={Object.fromEntries(exercises.map((e) => [e.id, e.name]))}
          submitLabel="Créer la séance"
        />
      </Container>
    </>
  );
}
