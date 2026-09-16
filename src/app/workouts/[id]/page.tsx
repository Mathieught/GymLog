import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getWorkoutTemplateDetail } from "@/lib/queries/workout-templates";
import { getActiveExercises } from "@/lib/queries/exercises";
import { getCurrentUserId } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { WorkoutEditTrigger } from "@/components/workouts/workout-edit-trigger";
import { archiveWorkoutTemplate } from "@/lib/actions/workout-templates";

export default async function WorkoutTemplateDetailPage({
  params,
}: PageProps<"/workouts/[id]">) {
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
  const editDefaultValues = {
    name: template.name,
    description: template.description,
    exercises: template.exercises.map((workoutExercise) => ({
      exerciseId: workoutExercise.exerciseId,
    })),
    scheduleDays: template.schedules.map((schedule) => schedule.dayOfWeek),
  };

  return (
    <>
      <PageHeader
        backHref="/workouts"
        title={`Séance : ${template.name}`}
        right={
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
      />
      <Container>
        {template.description && (
          <p className="mb-4 text-sm text-neutral-600">{template.description}</p>
        )}

        {template.exercises.length === 0 ? (
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
        ) : (
          <>
            <p className="mb-2 text-sm text-neutral-500">
              Touchez un exercice pour démarrer la séance.
            </p>
            <ul className="space-y-2">
              {template.exercises.map((workoutExercise) => (
                <li key={workoutExercise.id}>
                  <Link
                    href={`/workouts/${template.id}/session?exercise=${workoutExercise.exerciseId}`}
                  >
                    <Card className="flex items-center justify-between transition-colors hover:border-neutral-400">
                      <div>
                        <p className="font-medium">{workoutExercise.exercise.name}</p>
                        <p className="text-sm text-neutral-500">
                          {workoutExercise.exercise.muscle.join(", ")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400" />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <form action={archiveWorkoutTemplate.bind(null, template.id)} className="mt-8">
          <ConfirmSubmitButton
            type="submit"
            variant="danger"
            size="sm"
            confirmMessage={`Supprimer "${template.name}" ? Elle n'apparaîtra plus dans vos listes, mais l'historique existant sera conservé.`}
          >
            Supprimer la séance
          </ConfirmSubmitButton>
        </form>
      </Container>
    </>
  );
}
