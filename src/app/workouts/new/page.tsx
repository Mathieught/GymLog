import { getCurrentUserId } from "@/lib/current-user";
import { getActiveExercises } from "@/lib/queries/exercises";
import { WorkoutTemplateForm } from "@/components/workouts/workout-template-form";
import { createWorkoutTemplate } from "@/lib/actions/workout-templates";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

export default async function NewWorkoutPage() {
  const userId = await getCurrentUserId();
  const exercises = await getActiveExercises(userId);

  return (
    <>
      <PageHeader backHref="/workouts" title="Nouvelle séance" />
      <Container>
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
