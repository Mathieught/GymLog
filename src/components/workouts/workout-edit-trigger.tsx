"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkoutFormSheet } from "@/components/workouts/workout-form-sheet";
import { updateWorkoutTemplate } from "@/lib/actions/workout-templates";

type ExerciseOption = { id: string; name: string; muscle: string[]; targetSets: number };

// Ouvre l'édition d'une séance existante dans une popup (voir WorkoutFormSheet) plutôt que de
// naviguer vers /workouts/[id]/edit. Utilisé pour le bouton "Modifier" de l'en-tête et pour
// "+ Ajouter des exercices" (état vide) sur la page détail — d'où label/variant/size en props
// plutôt qu'un rendu fixe.
export function WorkoutEditTrigger({
  templateId,
  templateName,
  defaultValues,
  exerciseOptions,
  exerciseNamesById,
  label,
  variant,
  size,
  className,
}: {
  templateId: string;
  templateName: string;
  defaultValues: {
    name: string;
    description: string | null;
    exercises: { exerciseId: string }[];
    scheduleDays: number[];
  };
  exerciseOptions: ExerciseOption[];
  exerciseNamesById: Record<string, string>;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      {open && (
        <WorkoutFormSheet
          title={`Modifier ${templateName}`}
          action={updateWorkoutTemplate.bind(null, templateId)}
          exerciseOptions={exerciseOptions}
          exerciseNamesById={exerciseNamesById}
          defaultValues={defaultValues}
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
