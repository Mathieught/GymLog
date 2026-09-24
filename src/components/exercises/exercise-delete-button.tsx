"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
      {/* Icône seule, à côté de "Modifier" dans l'en-tête de la page détail. */}
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setPendingDelete(true)}
        aria-label="Supprimer l'exercice"
        className="w-9 px-0"
      >
        <Trash2 className="h-4 w-4" />
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
