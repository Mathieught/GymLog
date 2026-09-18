import Link from "next/link";
import { getCurrentUserId } from "@/lib/current-user";
import { getActiveExercises } from "@/lib/queries/exercises";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { ExerciseSearchList } from "@/components/exercises/exercise-search-list";
import { ExerciseCreateTrigger } from "@/components/exercises/exercise-create-trigger";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const { muscle: selectedMuscleRaw } = await searchParams;
  const userId = await getCurrentUserId();
  const exercises = await getActiveExercises(userId);

  const availableMuscles = MUSCLE_GROUPS.filter((muscle) =>
    exercises.some((exercise) => exercise.muscle.includes(muscle))
  );
  const requestedMuscles = (
    typeof selectedMuscleRaw === "string" ? selectedMuscleRaw.split(",") : selectedMuscleRaw ?? []
  ).filter((muscle) => availableMuscles.includes(muscle as (typeof MUSCLE_GROUPS)[number]));
  const selectedMuscles = new Set(requestedMuscles);

  const groups = MUSCLE_GROUPS.filter((muscle) => selectedMuscles.size === 0 || selectedMuscles.has(muscle))
    .map((muscle) => ({
      muscle,
      exercises: exercises.filter((exercise) => exercise.muscle.includes(muscle)),
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
    <Container topSafeArea>
      <PageTitle action={<ExerciseCreateTrigger />}>Exercices</PageTitle>

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
                // Même convention que MuscleGroupPicker : l'accent marque "sélectionné/actif",
                // pas le remplissage noir/blanc réservé aux boutons d'action.
                selectedMuscles.size === 0
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-neutral-200 text-neutral-600 hover:border-accent-deep/50 hover:bg-accent-soft/40"
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
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-neutral-200 text-neutral-600 hover:border-accent-deep/50 hover:bg-accent-soft/40"
                )}
              >
                {muscle}
              </Link>
            ))}
          </div>

          <ExerciseSearchList groups={groups} />
        </>
      )}
    </Container>
  );
}
