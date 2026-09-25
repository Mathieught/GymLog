import { notFound } from "next/navigation";
import { getLastSessionDates, getWorkoutTemplateDetail } from "@/lib/queries/workout-templates";
import { formatDaysAgo } from "@/lib/utils";
import { formatScheduleDays } from "@/lib/constants";
import { getActiveExercises } from "@/lib/queries/exercises";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutEditTrigger } from "@/components/workouts/workout-edit-trigger";
import { WorkoutProgramBody } from "@/components/workouts/workout-program-body";

export default async function WorkoutTemplateDetailPage({
  params,
}: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const [template, availableExercises, lastSessionDates] = await Promise.all([
    getWorkoutTemplateDetail(id),
    getActiveExercises(userId),
    getLastSessionDates(userId),
  ]);
  if (!template || template.isArchived) notFound();

  const exerciseNamesById: Record<string, string> = Object.fromEntries(
    availableExercises.map((exercise) => [exercise.id, exercise.name])
  );
  for (const workoutExercise of template.exercises) {
    exerciseNamesById[workoutExercise.exerciseId] = workoutExercise.exercise.name;
  }
  const editDefaultValues = {
    name: template.name,
    description: template.description,
    exercises: template.exercises.map((workoutExercise) => ({
      exerciseId: workoutExercise.exerciseId,
    })),
    scheduleDays: template.schedules.map((schedule) => schedule.dayOfWeek),
  };

  const lastSession = lastSessionDates.get(template.id);
  const scheduleLabel = formatScheduleDays(template.schedules.map((s) => s.dayOfWeek));
  const exerciseCount = template.exercises.length;
  const meta = [
    `${exerciseCount} exercice${exerciseCount > 1 ? "s" : ""}`,
    scheduleLabel,
    lastSession ? formatDaysAgo(lastSession) : "Jamais faite",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <WorkoutProgramBody
      headerRight={
        <WorkoutEditTrigger
          templateId={template.id}
          templateName={template.name}
          defaultValues={editDefaultValues}
          exerciseOptions={availableExercises}
          exerciseNamesById={exerciseNamesById}
          label="Modifier"
          variant="secondary"
          size="sm"
        />
      }
      templateId={template.id}
      name={template.name}
      meta={meta}
      description={template.description}
      exercises={template.exercises.map((workoutExercise) => ({
        id: workoutExercise.id,
        exerciseId: workoutExercise.exerciseId,
        name: workoutExercise.exercise.name,
        muscles: workoutExercise.exercise.muscle,
        targetSets: workoutExercise.targetSets,
        targetMinutes: workoutExercise.exercise.targetMinutes,
      }))}
      emptyState={
        <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-center">
          <p className="text-sm text-neutral-500">Aucun exercice ajouté pour l&apos;instant.</p>
          <WorkoutEditTrigger
            templateId={template.id}
            templateName={template.name}
            defaultValues={editDefaultValues}
            exerciseOptions={availableExercises}
            exerciseNamesById={exerciseNamesById}
            label="+ Ajouter des exercices"
            size="sm"
            className="mt-3"
          />
        </div>
      }
    />
  );
}
