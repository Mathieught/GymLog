"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFormSheet } from "@/components/exercises/exercise-form-sheet";
import { updateExercise } from "@/lib/actions/exercises";

// Ouvre l'édition d'un exercice existant dans une popup (voir ExerciseFormSheet) plutôt que de
// naviguer vers /exercises/[id]/edit.
export function ExerciseEditTrigger({
  exerciseId,
  exerciseName,
  defaultValues,
}: {
  exerciseId: string;
  exerciseName: string;
  defaultValues: {
    name: string;
    muscle: string[];
    targetSets: number;
    description: string | null;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Modifier
      </Button>

      {open && (
        <ExerciseFormSheet
          title={`Modifier ${exerciseName}`}
          submitLabel="Enregistrer"
          action={updateExercise.bind(null, exerciseId)}
          defaultValues={defaultValues}
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
