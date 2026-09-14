"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { SetHistoryRecap } from "@/components/sessions/set-history-recap";

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

type RecapEntry = { sessionDate: Date; actualWeight: number | null; actualReps: number | null };

// Une série existante se modifie en la touchant : la popup s'ouvre pré-remplie, et "Valider"
// l'enregistre (marquée terminée) en un seul geste — plus de case à cocher séparée. Le récap de
// l'historique (recap) est rendu à l'intérieur de ce même bloc, séparé par un filet, plutôt qu'en
// ligne flottante entre deux séries : chaque bloc reste un tout, sans ambiguïté sur à quelle série
// le récap appartient.
export function SetRow({
  set,
  canRemove,
  previousSet,
  recap,
  locked = false,
  onUpdate,
  onRemove,
}: {
  set: SetForRow;
  canRemove: boolean;
  previousSet?: PreviousSetForRow;
  recap: RecapEntry[];
  locked?: boolean;
  onUpdate: (setId: string, actualWeight: number, actualReps: number) => void;
  onRemove: (setId: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState(set.actualWeight ?? previousSet?.actualWeight ?? 0);
  const [reps, setReps] = useState(set.actualReps ?? previousSet?.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    onUpdate(set.id, weight, reps);
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-white transition-colors",
          set.completed ? "border-neutral-900" : "border-dashed border-neutral-300",
          !locked && "hover:bg-neutral-50 active:bg-neutral-100"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-3">
          <span className="w-5 shrink-0 text-center text-sm font-medium text-neutral-400">
            {set.setNumber}
          </span>
          {locked ? (
            <span className="flex-1 text-sm font-medium tabular-nums text-neutral-400">
              {reps} <span className="text-xs font-normal text-neutral-300">×</span> {weight}{" "}
              <span className="text-xs font-normal text-neutral-300">kg</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-full flex-1 text-left text-sm font-medium tabular-nums outline-none"
            >
              {reps} <span className="text-xs font-normal text-neutral-400">×</span> {weight}{" "}
              <span className="text-xs font-normal text-neutral-400">kg</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(set.id)}
            disabled={!canRemove}
            className={cn(
              "shrink-0 text-neutral-400 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30",
              locked && "ml-auto"
            )}
            aria-label="Supprimer la série"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {recap.length > 0 && (
          <div className="border-t border-neutral-100 px-3 py-1.5">
            <SetHistoryRecap entries={recap} />
          </div>
        )}
      </div>

      {!locked && (
        <SetValueSheet
          open={sheetOpen}
          label={`Série ${set.setNumber}`}
          weight={weight}
          reps={reps}
          onChangeWeight={setWeight}
          onChangeReps={setReps}
          onClose={() => setSheetOpen(false)}
          onValidate={validate}
        />
      )}
    </>
  );
}
