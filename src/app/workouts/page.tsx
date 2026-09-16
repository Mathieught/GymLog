import { getCurrentUserId } from "@/lib/current-user";
import { getActiveWorkoutTemplates } from "@/lib/queries/workout-templates";
import { Container } from "@/components/ui/container";
import { WorkoutList } from "@/components/workouts/workout-list";
import { formatScheduleDays } from "@/lib/constants";

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();
  const templates = await getActiveWorkoutTemplates(userId);

  return (
    <Container topSafeArea>
      <WorkoutList
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          exerciseCount: template._count.exercises,
          scheduleLabel: formatScheduleDays(template.schedules.map((s) => s.dayOfWeek)),
        }))}
      />
    </Container>
  );
}
