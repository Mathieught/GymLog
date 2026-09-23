import { getCurrentUserId } from "@/lib/current-user";
import { getActiveWorkoutTemplates, getLastSessionDates } from "@/lib/queries/workout-templates";
import { getActiveExercises } from "@/lib/queries/exercises";
import { Container } from "@/components/ui/container";
import { WorkoutList } from "@/components/workouts/workout-list";
import { formatDaysAgo, isWithinDays } from "@/lib/utils";
import { formatScheduleDays } from "@/lib/constants";

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();
  const [templates, exercises, lastSessionDates] = await Promise.all([
    getActiveWorkoutTemplates(userId),
    getActiveExercises(userId),
    getLastSessionDates(userId),
  ]);

  return (
    <Container topSafeArea>
      <WorkoutList
        templates={templates.map((template) => {
          const lastSession = lastSessionDates.get(template.id);
          return {
            id: template.id,
            name: template.name,
            exerciseCount: template.exercises.length,
            scheduleLabel: formatScheduleDays(template.schedules.map((s) => s.dayOfWeek)),
            muscles: [...new Set(template.exercises.flatMap((e) => e.exercise.muscle))],
            // Libellé calculé ici plutôt que dans WorkoutList (client) : un Date.now() différent
            // entre serveur et client ferait diverger l'hydratation.
            lastSessionLabel: lastSession ? formatDaysAgo(lastSession) : "Jamais faite",
            lastSessionRecent: !!lastSession && isWithinDays(lastSession, 7),
          };
        })}
        exerciseOptions={exercises}
        exerciseNamesById={Object.fromEntries(exercises.map((e) => [e.id, e.name]))}
      />
    </Container>
  );
}
