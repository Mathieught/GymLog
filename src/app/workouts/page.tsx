import { getCurrentUserId } from "@/lib/current-user";
import { getActiveWorkoutTemplates } from "@/lib/queries/workout-templates";
import { getActiveExercises } from "@/lib/queries/exercises";
import { Container } from "@/components/ui/container";
import { WorkoutList } from "@/components/workouts/workout-list";
import { formatScheduleDays } from "@/lib/constants";

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();
  const [templates, exercises] = await Promise.all([
    getActiveWorkoutTemplates(userId),
    getActiveExercises(userId),
  ]);

  return (
    <Container topSafeArea>
      <WorkoutList
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          exerciseCount: template._count.exercises,
          scheduleLabel: formatScheduleDays(template.schedules.map((s) => s.dayOfWeek)),
        }))}
        exerciseOptions={exercises}
        exerciseNamesById={Object.fromEntries(exercises.map((e) => [e.id, e.name]))}
      />
    </Container>
  );
}
