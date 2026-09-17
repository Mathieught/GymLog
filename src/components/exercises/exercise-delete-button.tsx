"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { archiveExercise } from "@/lib/actions/exercises";

// Remplace ConfirmSubmitButton (window.confirm) par la même popup de confirmation que le reste de
// l'app (suppression d'une séance, etc.), pour une expérience cohérente plutôt qu'une boîte de
// dialogue native.
export function ExerciseDeleteButton({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string;
  exerciseName: string;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setPendingDelete(true)}>
        Supprimer l&apos;exercice
      </Button>

      {pendingDelete && (
        <ConfirmDialog
          message={`Supprimer "${exerciseName}" ? Il n'apparaîtra plus dans vos listes, mais l'historique existant sera conservé.`}
          onConfirm={() => archiveExercise(exerciseId)}
          onCancel={() => setPendingDelete(false)}
        />
      )}
    </>
  );
}
