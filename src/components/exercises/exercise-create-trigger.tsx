"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFormSheet } from "@/components/exercises/exercise-form-sheet";
import { createExercise } from "@/lib/actions/exercises";

// Ouvre la création d'exercice dans une popup (voir ExerciseFormSheet) plutôt que de naviguer vers
// /exercises/new.
export function ExerciseCreateTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        + Nouvel exercice
      </Button>

      {open && (
        <ExerciseFormSheet
          setsOptional
          title="Nouvel exercice"
          action={createExercise}
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
