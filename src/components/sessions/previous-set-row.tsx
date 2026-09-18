"use client";

import { useState } from "react";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { SetStateBadge } from "@/components/sessions/set-state-badge";

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
  exerciseId,
  exerciseOrder,
  locked = false,
  onLog,
}: {
  previousSet: PreviousSetForRow;
  exerciseId: string;
  exerciseOrder: number;
  locked?: boolean;
  onLog: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState(previousSet.actualWeight ?? 0);
  const [reps, setReps] = useState(previousSet.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    onLog(exerciseId, exerciseOrder, weight, reps);
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
        <div className="flex h-14 items-center gap-3 px-3">
          <SetStateBadge setNumber={previousSet.setNumber} state="locked" />
          <span className="flex-1 font-mono text-sm font-medium tabular-nums text-neutral-300">
            {reps} <span className="text-xs font-normal text-neutral-300">×</span> {weight}{" "}
            <span className="text-xs font-normal text-neutral-300">kg</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:bg-neutral-100 active:bg-neutral-200">
        <div className="flex h-14 items-center gap-3 px-3">
          <SetStateBadge setNumber={previousSet.setNumber} state="pending" />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="h-full flex-1 text-left font-mono text-sm font-medium tabular-nums text-neutral-400 outline-none"
          >
            {reps} <span className="text-xs font-normal text-neutral-400">×</span> {weight}{" "}
            <span className="text-xs font-normal text-neutral-400">kg</span>
          </button>
        </div>
      </div>

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
