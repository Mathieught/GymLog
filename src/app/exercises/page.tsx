import Link from "next/link";
import { getCurrentUserId } from "@/lib/current-user";
import { getActiveExercises } from "@/lib/queries/exercises";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const { muscle: selectedMuscleRaw } = await searchParams;
  const userId = await getCurrentUserId();
  const exercises = await getActiveExercises(userId);

  const availableMuscles = MUSCLE_GROUPS.filter((muscle) =>
    exercises.some((exercise) => exercise.muscle === muscle)
  );
  const requestedMuscles = (
    typeof selectedMuscleRaw === "string" ? selectedMuscleRaw.split(",") : selectedMuscleRaw ?? []
  ).filter((muscle) => availableMuscles.includes(muscle as (typeof MUSCLE_GROUPS)[number]));
  const selectedMuscles = new Set(requestedMuscles);

  const groups = MUSCLE_GROUPS.filter((muscle) => selectedMuscles.size === 0 || selectedMuscles.has(muscle))
    .map((muscle) => ({
      muscle,
      exercises: exercises.filter((exercise) => exercise.muscle === muscle),
    }))
    .filter((group) => group.exercises.length > 0);

  const hrefForToggle = (muscle: string) => {
    const next = new Set(selectedMuscles);
    if (next.has(muscle)) {
      next.delete(muscle);
    } else {
      next.add(muscle);
    }
    return next.size === 0 ? "/exercises" : `/exercises?muscle=${[...next].map(encodeURIComponent).join(",")}`;
  };

  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle
          action={
            <ButtonLink href="/exercises/new" size="sm">
              + Nouvel exercice
            </ButtonLink>
          }
        >
          Exercices
        </PageTitle>

        {exercises.length === 0 ? (
          <p className="text-neutral-500">
            Aucun exercice pour l&apos;instant. Créez votre premier exercice pour commencer.
          </p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              <Link
                href="/exercises"
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selectedMuscles.size === 0
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                )}
              >
                Tous
              </Link>
              {availableMuscles.map((muscle) => (
                <Link
                  key={muscle}
                  href={hrefForToggle(muscle)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    selectedMuscles.has(muscle)
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                  )}
                >
                  {muscle}
                </Link>
              ))}
            </div>

            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.muscle}>
                  <h2 className="mb-2 text-sm font-medium text-neutral-500">{group.muscle}</h2>
                  <ul className="space-y-2">
                    {group.exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <Link href={`/exercises/${exercise.id}`}>
                          <Card className="transition-colors hover:border-neutral-400">
                            <p className="font-medium">{exercise.name}</p>
                            <p className="text-sm text-neutral-500">
                              {exercise.targetWeight} kg × {exercise.targetReps} reps
                            </p>
                          </Card>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </Container>
    </>
  );
}
