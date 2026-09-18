"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

// Une série existante se modifie en la touchant : la popup s'ouvre pré-remplie, et "Valider"
// l'enregistre (marquée terminée) en un seul geste — plus de case à cocher séparée.
export function SetRow({
  set,
  canRemove,
  previousSet,
  locked = false,
  onUpdate,
  onReset,
  onRemove,
}: {
  set: SetForRow;
  canRemove: boolean;
  previousSet?: PreviousSetForRow;
  locked?: boolean;
  onUpdate: (setId: string, actualWeight: number, actualReps: number) => void;
  onReset: (setId: string) => void;
  onRemove: (setId: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [weight, setWeight] = useState(set.actualWeight ?? previousSet?.actualWeight ?? 0);
  const [reps, setReps] = useState(set.actualReps ?? previousSet?.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    onUpdate(set.id, weight, reps);
  }

  // Deux gestes différents derrière ce bouton, selon qu'il y a déjà un résultat à perdre :
  // - série déjà validée : on annule le résultat et on vide vraiment la série (pas de retour à
  //   l'historique ici — sinon le nouvel affichage ressemble à s'y méprendre à l'ancienne valeur
  //   encore présente, et la réinitialisation a l'air de n'avoir rien fait). La série reste à sa
  //   place, prête à être resaisie depuis zéro. Pas de confirmation : c'est réversible, il suffit
  //   de la resaisir.
  // - série jamais renseignée (juste ajoutée) : rien à perdre en valeur, mais la retirer change la
  //   structure de la séance (renumérotation) — ça, ça se confirme.
  function handleAction() {
    if (set.completed) {
      setWeight(0);
      setReps(0);
      onReset(set.id);
      return;
    }
    setPendingRemove(true);
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border transition-colors",
          // Verrouillée : même traitement visuel quel que soit l'état de complétion, pour ne
          // signaler qu'une seule chose ("pas encore accessible") sans se mélanger avec
          // faite/à faire — voir aussi PreviousSetRow (verrou identique).
          locked
            ? "border-dashed border-neutral-200 opacity-45"
            : set.completed
              ? "border-accent bg-accent-soft"
              : "border-dashed border-neutral-300 bg-white",
          !locked && !set.completed && "hover:bg-neutral-50 active:bg-neutral-100"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-3">
          <span className="w-4 shrink-0 text-center text-sm font-medium text-neutral-500">
            {set.setNumber}
          </span>
          {locked ? (
            <span className="flex-1 font-mono text-sm font-medium tabular-nums text-neutral-400">
              {reps} <span className="text-xs font-normal text-neutral-300">×</span> {weight}{" "}
              <span className="text-xs font-normal text-neutral-300">kg</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(
                "h-full flex-1 text-left font-mono text-sm font-medium tabular-nums outline-none",
                // Grisé tant que ce n'est pas validé cette séance (série vierge, ou tout juste
                // réinitialisée) : sans ça, la suggestion pré-remplie ressemble à s'y méprendre à
                // un résultat déjà enregistré — surtout gênant juste après une suppression/reset
                // dont la valeur retombe par coïncidence sur celle de l'historique.
                !set.completed && "text-neutral-400"
              )}
            >
              {reps} <span className="text-xs font-normal text-neutral-400">×</span> {weight}{" "}
              <span className="text-xs font-normal text-neutral-400">kg</span>
            </button>
          )}
          {locked ? (
            <span aria-hidden className="shrink-0 pr-1 text-sm tracking-wider text-neutral-400">
              ⋯
            </span>
          ) : (
            <button
              type="button"
              data-no-swipe
              onClick={handleAction}
              disabled={!canRemove}
              className={cn(
                "-mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                // L'icône d'annulation d'une série déjà validée porte un fond accent permanent
                // (pas seulement au survol) : c'est le seul repère de progression de la rangée,
                // il doit rester visible sans interaction. La corbeille d'une série vierge garde
                // un anneau neutre au repos (écho du glyphe "à faire" de la maquette) et vire au
                // rouge seulement au survol.
                set.completed
                  ? "bg-accent-soft text-accent-deep hover:brightness-110 active:brightness-95"
                  : "text-neutral-400 ring-1 ring-inset ring-neutral-300 hover:bg-danger/15 hover:text-danger hover:ring-danger/40 active:bg-danger/25",
                "disabled:pointer-events-none disabled:opacity-30"
              )}
              aria-label={set.completed ? "Annuler le résultat de cette série" : "Supprimer cette série"}
            >
              {set.completed ? <RotateCcw className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
            </button>
          )}
        </div>
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

      {pendingRemove && (
        <ConfirmDialog
          message="Supprimer cette série de la séance ?"
          onConfirm={() => {
            setPendingRemove(false);
            onRemove(set.id);
          }}
          onCancel={() => setPendingRemove(false)}
        />
      )}
    </>
  );
}
