"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
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
// /workouts/[id]/edit. Fermer/valider sont deux icônes dans l'en-tête de la popup (voir
// BottomSheet) plutôt qu'un gros bouton texte en bas.
export function WorkoutFormSheet({
  title,
  action,
  exerciseOptions,
  exerciseNamesById,
  defaultValues,
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
  onClose: () => void;
  onSuccess: () => void;
}) {
  const formId = useId();
  const [pending, setPending] = useState(false);

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      headerActions={
        <button
          type="submit"
          form={formId}
          disabled={pending}
          aria-label="Valider"
          className="rounded-full bg-neutral-900 p-1.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
        </button>
      }
    >
      <WorkoutTemplateForm
        formId={formId}
        action={action}
        exerciseOptions={exerciseOptions}
        exerciseNamesById={exerciseNamesById}
        defaultValues={defaultValues}
        onSuccess={onSuccess}
        onPendingChange={setPending}
      />
    </BottomSheet>
  );
}
