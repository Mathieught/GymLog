"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import type { ActionState } from "@/lib/action-state";

// Popup de création/édition d'exercice, ouverte depuis la liste des exercices ou depuis le détail
// d'un exercice, au lieu de naviguer vers /exercises/new ou /exercises/[id]/edit. Fermer/valider
// sont deux icônes dans l'en-tête de la popup (voir BottomSheet) plutôt qu'un gros bouton texte.
export function ExerciseFormSheet({
  title,
  action,
  defaultValues,
  onClose,
  onSuccess,
}: {
  title: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number;
    description: string | null;
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
          className="rounded-full bg-accent p-1.5 text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
        </button>
      }
    >
      <ExerciseForm
        formId={formId}
        action={action}
        defaultValues={defaultValues}
        onSuccess={onSuccess}
        onPendingChange={setPending}
      />
    </BottomSheet>
  );
}
