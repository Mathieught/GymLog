"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetValueText } from "@/components/sessions/set-row";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { SetRecap } from "@/components/sessions/set-recap";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SessionRowRecapEntry } from "@/lib/session-rows";

type PreviousSetForRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
};

// Suggestion pour une série pas encore réalisée cette séance, pré-remplie avec la performance de
// la dernière fois : la toucher ouvre la même popup que pour une série déjà enregistrée, et
// "Valider" la crée directement comme terminée. Verrouillée (saisie impossible) tant que la série
// précédente n'est pas validée — mais toujours supprimable, même avant d'y être arrivé.
// `highlight` marque la prochaine série à renseigner : "start" tant que la séance n'a pas démarré
// (c'est elle qui la lance), "next" ensuite.
export function PreviousSetRow({
  setNumber,
  previousSet,
  exerciseId,
  exerciseOrder,
  recap,
  locked = false,
  canRemove,
  highlight,
  onLog,
  onDismiss,
  cardio = false,
}: {
  // Numéro affiché ; `previousSet.setNumber` est le numéro source (historique), qui peut différer
  // une fois des suggestions supprimées (voir skippedSuggestions dans session-rows.ts).
  setNumber: number;
  previousSet: PreviousSetForRow;
  exerciseId: string;
  exerciseOrder: number;
  recap: SessionRowRecapEntry[];
  locked?: boolean;
  canRemove: boolean;
  highlight?: "start" | "next";
  onLog: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onDismiss: (exerciseId: string, sourceSetNumber: number) => void;
  cardio?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [weight, setWeight] = useState(previousSet.actualWeight ?? 0);
  const [reps, setReps] = useState(previousSet.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    onLog(exerciseId, exerciseOrder, weight, reps);
  }

  const value = <SetValueText reps={reps} weight={weight} cardio={cardio} />;

  return (
    <>
      <div
        className={cn(
          "rounded-xl border transition-colors",
          locked
            ? "border-dashed border-neutral-200 bg-neutral-50"
            : highlight
              ? "animate-ring-pulse border-accent bg-white"
              : "border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-3">
          <span
            className={cn(
              "w-4 shrink-0 text-center text-sm font-medium",
              highlight && !locked ? "text-accent-deep" : "text-neutral-500",
              locked && "opacity-45"
            )}
          >
            {setNumber}
          </span>
          {locked ? (
            <span className="flex-1 font-mono text-sm font-medium tabular-nums text-neutral-300 opacity-45">
              {value}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(
                "flex h-full flex-1 items-center justify-between gap-2 text-left font-mono text-sm font-medium tabular-nums outline-none",
                highlight ? "text-neutral-900" : "text-neutral-400"
              )}
            >
              <span>{value}</span>
              {highlight && (
                <span className="font-sans text-xs font-medium text-accent-deep">
                  {highlight === "start" ? "Toucher pour saisir" : "Suivante"}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            data-no-swipe
            onClick={() => setPendingRemove(true)}
            disabled={!canRemove}
            className="-mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 ring-1 ring-inset ring-neutral-300 hover:bg-danger/15 hover:text-danger hover:ring-danger/40 active:bg-danger/25 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Supprimer cette série"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <div className={cn(locked && "opacity-45")}>
          <SetRecap entries={recap} cardio={cardio} />
        </div>
      </div>

      {!locked && (
        <SetValueSheet
          open={sheetOpen}
          label={`Série ${setNumber}`}
          weight={weight}
          reps={reps}
          onChangeWeight={setWeight}
          onChangeReps={setReps}
          onClose={() => setSheetOpen(false)}
          onValidate={validate}
          cardio={cardio}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          message="Supprimer cette série de la séance ?"
          onConfirm={() => {
            setPendingRemove(false);
            onDismiss(exerciseId, previousSet.setNumber);
          }}
          onCancel={() => setPendingRemove(false)}
        />
      )}
    </>
  );
}
