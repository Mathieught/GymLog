"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { WorkoutTemplateForm } from "@/components/workouts/workout-template-form";
import type { ActionState } from "@/lib/action-state";

type ExerciseOption = {
  id: string;
  name: string;
  muscle: string[];
  targetSets: number;
};

// Popup de création/édition de séance, ouverte depuis la liste des séances ou depuis le détail
// d'une séance (voir WorkoutList / la page détail) au lieu de naviguer vers /workouts/new ou
// /workouts/[id]/edit.
export function WorkoutFormSheet({
  title,
  action,
  exerciseOptions,
  exerciseNamesById,
  defaultValues,
  submitLabel,
  onClose,
  onSuccess,
}: {
  title: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  exerciseOptions: ExerciseOption[];
  exerciseNamesById: Record<string, string>;
  defaultValues?: {
    name: string;
    description: string | null;
    exercises: { exerciseId: string }[];
    scheduleDays: number[];
  };
  submitLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      <WorkoutTemplateForm
        action={action}
        exerciseOptions={exerciseOptions}
        exerciseNamesById={exerciseNamesById}
        defaultValues={defaultValues}
        submitLabel={submitLabel}
        onSuccess={onSuccess}
      />
    </BottomSheet>
  );
}
