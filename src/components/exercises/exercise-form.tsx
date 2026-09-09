"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { initialActionState, type ActionState } from "@/lib/action-state";

export function ExerciseForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    muscle: string;
    targetWeight: number;
    targetReps: number;
    description: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [muscle, setMuscle] = useState(defaultValues?.muscle ?? "");

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nom de l&apos;exercice</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="Développé couché"
          required
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="muscle">Muscle ciblé</Label>
        <MuscleGroupPicker id="muscle" name="muscle" value={muscle} onChange={setMuscle} />
        <FieldError messages={state.fieldErrors?.muscle} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="targetWeight">Poids cible (kg)</Label>
          <Input
            id="targetWeight"
            name="targetWeight"
            type="number"
            step="0.5"
            min="0"
            defaultValue={defaultValues?.targetWeight}
            required
          />
          <FieldError messages={state.fieldErrors?.targetWeight} />
        </div>
        <div>
          <Label htmlFor="targetReps">Répétitions cibles</Label>
          <Input
            id="targetReps"
            name="targetReps"
            type="number"
            step="1"
            min="1"
            defaultValue={defaultValues?.targetReps}
            required
          />
          <FieldError messages={state.fieldErrors?.targetReps} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Note / description (facultatif)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Ex : buter légèrement les omoplates, prise large..."
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enregistrement..." : submitLabel}
      </Button>
    </form>
  );
}
