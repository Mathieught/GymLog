import { ExerciseForm } from "@/components/exercises/exercise-form";
import { createExercise } from "@/lib/actions/exercises";

export default function NewExercisePage() {
  return (
    <ExerciseForm
      action={createExercise}
      backHref="/exercises"
      title="Nouvel exercice"
      submitLabel="Créer l'exercice"
    />
  );
}
