"use client";

import { useActionState, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { updateSet, removeSet } from "@/lib/actions/sessions";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";

type SetForRow = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

type PreviousSetForRow = {
  actualWeight: number | null;
  actualReps: number | null;
};

export function SetRow({
  set,
  canRemove,
  previousSet,
  locked = false,
}: {
  set: SetForRow;
  canRemove: boolean;
  previousSet?: PreviousSetForRow;
  locked?: boolean;
}) {
  const [, formAction] = useActionState(updateSet.bind(null, set.id), initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState(set.actualWeight ?? previousSet?.actualWeight ?? 0);
  const [reps, setReps] = useState(set.actualReps ?? previousSet?.actualReps ?? 0);

  function closeSheet() {
    setSheetOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-white p-3",
          set.completed ? "border-neutral-900" : "border-neutral-200"
        )}
      >
        <span className="w-5 text-center text-sm font-medium text-neutral-400">
          {set.setNumber}
        </span>
        <input type="hidden" name="actualWeight" value={weight} />
        <input type="hidden" name="actualReps" value={reps} />
        {locked ? (
          <span className="flex h-11 flex-1 items-center justify-center gap-1 text-sm font-medium tabular-nums text-neutral-400">
            <span>{weight}</span>
            <span className="text-xs font-normal text-neutral-300">kg ×</span>
            <span>{reps}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white text-sm font-medium tabular-nums outline-none hover:border-neutral-400 focus:border-neutral-900"
          >
            <span>{weight}</span>
            <span className="text-xs font-normal text-neutral-400">kg ×</span>
            <span>{reps}</span>
          </button>
        )}
        {!locked && (
          <label className="ml-auto flex items-center">
            <input
              type="checkbox"
              name="completed"
              value="true"
              defaultChecked={set.completed}
              onChange={() => formRef.current?.requestSubmit()}
              className="h-5 w-5 rounded border-neutral-300 accent-neutral-900"
              aria-label="Série terminée"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => removeSet(set.id)}
          disabled={!canRemove}
          className={cn(
            "text-neutral-400 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30",
            locked && "ml-auto"
          )}
          aria-label="Supprimer la série"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>

      {!locked && (
        <SetValueSheet
          open={sheetOpen}
          label={`Série ${set.setNumber}`}
          weight={weight}
          reps={reps}
          onChangeWeight={setWeight}
          onChangeReps={setReps}
          onClose={closeSheet}
        />
      )}
    </>
  );
}
