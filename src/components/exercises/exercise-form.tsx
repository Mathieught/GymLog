"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { SetCountPicker } from "@/components/exercises/set-count-picker";
import { initialActionState, type ActionState } from "@/lib/action-state";

// Formulaire nu (pas d'en-tête ni de conteneur de page, pas de bouton de validation) : toujours
// ouvert dans une popup (ExerciseFormSheet), qui fournit son propre en-tête/scroll et dont le
// bouton de validation (icône dans l'en-tête) cible ce formulaire via son id.
export function ExerciseForm({
  formId,
  action,
  defaultValues,
  onSuccess,
  onPendingChange,
}: {
  formId?: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number;
    description: string | null;
  };
  // Appelé après un enregistrement réussi (voir ActionState.nonce) pour refermer la popup : les
  // actions create/updateExercise ne font plus de redirect() (on reste sur la page derrière la
  // popup, qui se revalide déjà toute seule).
  onSuccess?: () => void;
  // Reflète `pending` (useActionState) au parent : le bouton de validation vit dans l'en-tête de
  // la popup, hors de ce composant, et doit pourtant se désactiver pendant l'enregistrement.
  onPendingChange?: (pending: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const handledNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.nonce !== undefined && state.nonce !== handledNonce.current) {
      handledNonce.current = state.nonce;
      onSuccess?.();
    }
  }, [state, onSuccess]);
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  const [muscle, setMuscle] = useState<string[]>(defaultValues?.muscle ?? []);
  const [targetSets, setTargetSets] = useState(defaultValues?.targetSets ?? 3);

  return (
    <form id={formId} action={formAction} className="space-y-5">
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
        <Label htmlFor="muscle">Muscles ciblés</Label>
        <MuscleGroupPicker id="muscle" name="muscle" value={muscle} onChange={setMuscle} />
        <FieldError messages={state.fieldErrors?.muscle} />
      </div>

      <div>
        <Label htmlFor="targetSets">Nombre de série</Label>
        <SetCountPicker id="targetSets" name="targetSets" value={targetSets} onChange={setTargetSets} />
        <FieldError messages={state.fieldErrors?.targetSets} />
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

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
