import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { archiveWorkoutTemplate } from "@/lib/actions/workout-templates";
import { formatScheduleDays } from "@/lib/constants";

export default async function WorkoutTemplateDetailPage({
  params,
}: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      schedules: true,
    },
  });
  if (!template || template.isArchived) notFound();

  const scheduleLabel = formatScheduleDays(template.schedules.map((s) => s.dayOfWeek));

  return (
    <>
      <PageHeader backHref="/workouts" />
      <Container>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{template.name}</h1>
            {scheduleLabel && <p className="text-neutral-500">{scheduleLabel}</p>}
          </div>
          <ButtonLink href={`/workouts/${template.id}/edit`} variant="secondary" size="sm">
            Modifier
          </ButtonLink>
        </div>

        {template.description && (
          <p className="mb-4 text-sm text-neutral-600">{template.description}</p>
        )}

        {template.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-center">
            <p className="text-sm text-neutral-500">Aucun exercice ajouté pour l&apos;instant.</p>
            <ButtonLink href={`/workouts/${template.id}/edit`} size="sm" className="mt-3">
              + Ajouter des exercices
            </ButtonLink>
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
                        <p className="text-sm text-neutral-500">{workoutExercise.exercise.muscle}</p>
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
