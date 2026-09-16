"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import type { ActionState } from "@/lib/action-state";

// Popup de création/édition d'exercice, ouverte depuis la liste des exercices ou depuis le détail
// d'un exercice, au lieu de naviguer vers /exercises/new ou /exercises/[id]/edit.
export function ExerciseFormSheet({
  title,
  action,
  submitLabel,
  defaultValues,
  onClose,
  onSuccess,
}: {
  title: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number;
    description: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      <ExerciseForm
        action={action}
        submitLabel={submitLabel}
        defaultValues={defaultValues}
        onSuccess={onSuccess}
      />
    </BottomSheet>
  );
}
