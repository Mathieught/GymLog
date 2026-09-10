"use client";

import { useActionState, useRef, useState } from "react";
import { logSet } from "@/lib/actions/sessions";
import { initialActionState } from "@/lib/action-state";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";

type PreviousSetForRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
};

// Suggestion pour une série pas encore réalisée cette séance, pré-remplie avec la performance de
// la dernière fois : la toucher ouvre la même popup que pour une série déjà enregistrée, et
// "Valider" la crée directement comme terminée. Verrouillée (affichage seul) tant que la série
// précédente n'est pas validée.
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
  const formRef = useRef<HTMLFormElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState(previousSet.actualWeight ?? 0);
  const [reps, setReps] = useState(previousSet.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    formRef.current?.requestSubmit();
  }

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
        ref={formRef}
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
        <span className="text-[11px] text-neutral-400">dernière fois</span>
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
        onValidate={validate}
      />
    </>
  );
}
