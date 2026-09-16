import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getActiveExercises } from "@/lib/queries/exercises";
import { getWorkoutTemplateDetail } from "@/lib/queries/workout-templates";
import { WorkoutTemplateForm } from "@/components/workouts/workout-template-form";
import { updateWorkoutTemplate } from "@/lib/actions/workout-templates";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

export default async function EditWorkoutPage({
  params,
}: PageProps<"/workouts/[id]/edit">) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [template, availableExercises] = await Promise.all([
    getWorkoutTemplateDetail(id),
    getActiveExercises(userId),
  ]);
  if (!template || template.isArchived) notFound();

  const exerciseNamesById: Record<string, string> = Object.fromEntries(
    availableExercises.map((exercise) => [exercise.id, exercise.name])
  );
  for (const workoutExercise of template.exercises) {
    exerciseNamesById[workoutExercise.exerciseId] = workoutExercise.exercise.name;
  }

  return (
    <>
      <PageHeader backHref={`/workouts/${template.id}`} title={`Modifier ${template.name}`} />
      <Container>
        <WorkoutTemplateForm
          action={updateWorkoutTemplate.bind(null, template.id)}
          exerciseOptions={availableExercises}
          exerciseNamesById={exerciseNamesById}
          defaultValues={{
            name: template.name,
            description: template.description,
            exercises: template.exercises.map((workoutExercise) => ({
              exerciseId: workoutExercise.exerciseId,
            })),
            scheduleDays: template.schedules.map((schedule) => schedule.dayOfWeek),
          }}
          submitLabel="Enregistrer les modifications"
        />
      </Container>
    </>
  );
}
