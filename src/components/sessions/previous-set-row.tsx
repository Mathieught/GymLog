"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { logSet } from "@/lib/actions/sessions";
import { initialActionState } from "@/lib/action-state";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";

type PreviousSetForRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
};

// Suggestion pour une série pas encore réalisée cette séance, pré-remplie avec la performance de
// la dernière fois : modifiable si l'on progresse, ou validable telle quelle si le poids ne
// change pas. Verrouillée (affichage seul) tant que la série précédente n'est pas validée.
export function PreviousSetRow({
  previousSet,
  addSetArg,
  exerciseId,
  exerciseOrder,
  locked = false,
}: {
  previousSet: PreviousSetForRow;
  addSetArg: string;
  exerciseId: string;
  exerciseOrder: number;
  locked?: boolean;
}) {
  const [state, formAction] = useActionState(
    logSet.bind(null, addSetArg, exerciseId, exerciseOrder),
    initialActionState
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState(previousSet.actualWeight ?? 0);
  const [reps, setReps] = useState(previousSet.actualReps ?? 0);

  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3">
        <span className="w-5 text-center text-sm font-medium text-neutral-300">
          {previousSet.setNumber}
        </span>
        <span className="flex h-11 flex-1 items-center justify-center gap-1 text-sm font-medium tabular-nums text-neutral-300">
          <span>{weight}</span>
          <span className="text-xs font-normal text-neutral-300">kg ×</span>
          <span>{reps}</span>
        </span>
        <span className="text-[11px] text-neutral-300">dernière fois</span>
      </div>
    );
  }

  return (
    <>
      <form
        action={formAction}
        className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3"
      >
        <span className="w-5 text-center text-sm font-medium text-neutral-400">
          {previousSet.setNumber}
        </span>
        <input type="hidden" name="actualWeight" value={weight} />
        <input type="hidden" name="actualReps" value={reps} />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white text-sm font-medium tabular-nums outline-none hover:border-neutral-400 focus:border-neutral-900"
        >
          <span>{weight}</span>
          <span className="text-xs font-normal text-neutral-400">kg ×</span>
          <span>{reps}</span>
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="text-[11px] text-neutral-400 hover:text-neutral-600"
        >
          dernière fois
        </button>
        <button
          type="submit"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700"
          aria-label="Valider cette série"
        >
          <Check className="h-4 w-4" />
        </button>
        {state.fieldErrors && (
          <p className="w-full text-xs text-red-600">
            {Object.values(state.fieldErrors).flat()[0]}
          </p>
        )}
      </form>

      <SetValueSheet
        open={sheetOpen}
        label={`Série ${previousSet.setNumber}`}
        weight={weight}
        reps={reps}
        onChangeWeight={setWeight}
        onChangeReps={setReps}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
