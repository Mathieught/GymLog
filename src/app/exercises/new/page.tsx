import { ExerciseForm } from "@/components/exercises/exercise-form";
import { createExercise } from "@/lib/actions/exercises";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

export default function NewExercisePage() {
  return (
    <>
      <PageHeader backHref="/exercises" />
      <Container>
        <h1 className="mb-6 text-2xl font-semibold">Nouvel exercice</h1>
        <ExerciseForm action={createExercise} submitLabel="Créer l'exercice" />
      </Container>
    </>
  );
}
