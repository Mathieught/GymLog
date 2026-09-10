"use client";

import { useActionState, useRef, useState } from "react";
import { logSet } from "@/lib/actions/sessions";
import { initialActionState } from "@/lib/action-state";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { SetHistoryRecap } from "@/components/sessions/set-history-recap";

type PreviousSetForRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
};

type RecapEntry = { sessionDate: Date; actualWeight: number | null; actualReps: number | null };

// Suggestion pour une série pas encore réalisée cette séance, pré-remplie avec la performance de
// la dernière fois : la toucher ouvre la même popup que pour une série déjà enregistrée, et
// "Valider" la crée directement comme terminée. Verrouillée (affichage seul) tant que la série
// précédente n'est pas validée. Le récap (recap) est rendu dans ce même bloc, séparé par un
// filet, jamais en ligne flottante entre deux séries.
export function PreviousSetRow({
  previousSet,
  addSetArg,
  exerciseId,
  exerciseOrder,
  recap,
  locked = false,
}: {
  previousSet: PreviousSetForRow;
  addSetArg: string;
  exerciseId: string;
  exerciseOrder: number;
  recap: RecapEntry[];
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
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
        <div className="flex h-14 items-center gap-3 px-3">
          <span className="w-5 shrink-0 text-center text-sm font-medium text-neutral-300">
            {previousSet.setNumber}
          </span>
          <span className="flex-1 text-sm font-medium tabular-nums text-neutral-300">
            {reps} <span className="text-xs font-normal text-neutral-300">×</span> {weight}{" "}
            <span className="text-xs font-normal text-neutral-300">kg</span>
          </span>
          <span className="shrink-0 text-[11px] text-neutral-300">dernière fois</span>
        </div>
        {recap.length > 0 && (
          <div className="border-t border-neutral-200 px-3 py-1.5">
            <SetHistoryRecap entries={recap} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
      >
        <div className="flex h-14 items-center gap-3 px-3">
          <span className="w-5 shrink-0 text-center text-sm font-medium text-neutral-400">
            {previousSet.setNumber}
          </span>
          <input type="hidden" name="actualWeight" value={weight} />
          <input type="hidden" name="actualReps" value={reps} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="h-full flex-1 text-left text-sm font-medium tabular-nums outline-none"
          >
            {reps} <span className="text-xs font-normal text-neutral-400">×</span> {weight}{" "}
            <span className="text-xs font-normal text-neutral-400">kg</span>
          </button>
          <span className="shrink-0 text-[11px] text-neutral-400">dernière fois</span>
        </div>
        {state.fieldErrors && (
          <p className="px-3 pb-1.5 text-xs text-red-600">
            {Object.values(state.fieldErrors).flat()[0]}
          </p>
        )}
        {recap.length > 0 && (
          <div className="border-t border-neutral-200 px-3 py-1.5">
            <SetHistoryRecap entries={recap} />
          </div>
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
