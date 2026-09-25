"use client";

import { useId, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import type { ActionState } from "@/lib/action-state";

// Popup de création/édition d'exercice, ouverte depuis la liste des exercices ou depuis le détail
// d'un exercice, au lieu de naviguer vers /exercises/new ou /exercises/[id]/edit. Validation par
// un gros bouton fixe en bas (+ Annuler) : l'ancienne petite coche dans l'en-tête passait inaperçue.
export function ExerciseFormSheet<S extends ActionState>({
  title,
  submitLabel = "Créer l'exercice",
  action,
  defaultValues,
  onClose,
  onSuccess,
  setsOptional,
}: {
  title: string;
  submitLabel?: string;
  action: (prevState: S, formData: FormData) => Promise<S>;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number | null;
    targetMinutes?: number | null;
    description: string | null;
  };
  onClose: () => void;
  onSuccess: (state: S) => void;
  setsOptional?: boolean;
}) {
  const formId = useId();
  const [pending, setPending] = useState(false);

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Enregistrement..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Annuler
          </button>
        </div>
      }
    >
      <ExerciseForm
        formId={formId}
        action={action}
        defaultValues={defaultValues}
        onSuccess={onSuccess}
        onPendingChange={setPending}
        setsOptional={setsOptional}
      />
    </BottomSheet>
  );
}
