"use client";

import { useState } from "react";
import { RotateCcw, StickyNote, Trash2 } from "lucide-react";
import { cn, formatReps, formatWeight } from "@/lib/utils";
import { SetValueSheet } from "@/components/sessions/set-value-sheet";
import { NoteSheet } from "@/components/sessions/note-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SetRecap } from "@/components/sessions/set-recap";
import type { SessionRowRecapEntry } from "@/lib/session-rows";

type SetForRow = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

type PreviousSetForRow = {
  actualWeight: number | null;
  actualReps: number | null;
};

// Une série existante se modifie en la touchant : la popup s'ouvre pré-remplie, et "Valider"
// l'enregistre (marquée terminée) en un seul geste — plus de case à cocher séparée. Le récap des 3
// dernières séances sur cette même série (voir SetRecap) est rendu dans ce même bloc, séparé par un
// filet, jamais en carte flottante entre deux séries.
export function SetRow({
  set,
  canRemove,
  previousSet,
  recap,
  locked = false,
  onUpdate,
  onReset,
  onRemove,
  onUpdateNote,
  cardio = false,
}: {
  set: SetForRow;
  canRemove: boolean;
  previousSet?: PreviousSetForRow;
  recap: SessionRowRecapEntry[];
  locked?: boolean;
  onUpdate: (setId: string, actualWeight: number, actualReps: number) => void;
  onReset: (setId: string) => void;
  onRemove: (setId: string) => void;
  onUpdateNote: (setId: string, note: string | null) => void;
  cardio?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [weight, setWeight] = useState(set.actualWeight ?? previousSet?.actualWeight ?? 0);
  const [reps, setReps] = useState(set.actualReps ?? previousSet?.actualReps ?? 0);

  function validate() {
    setSheetOpen(false);
    onUpdate(set.id, weight, reps);
  }

  // Deux gestes différents derrière ce bouton, selon qu'il y a déjà un résultat à perdre :
  // - série déjà validée : on annule le résultat, qui revient à sa suggestion d'origine (la
  //   dernière performance sur cette même série, comme une série jamais encore touchée) plutôt
  //   qu'à 0×0 — sinon retrouver le poids/les répétitions d'avant demande de rouvrir l'historique
  //   pour la resaisir. La série reste à sa place. Pas de confirmation : c'est réversible.
  // - série jamais renseignée (juste ajoutée) : rien à perdre en valeur, mais la retirer change la
  //   structure de la séance (renumérotation) — ça, ça se confirme.
  function handleAction() {
    if (set.completed) {
      setWeight(previousSet?.actualWeight ?? 0);
      setReps(previousSet?.actualReps ?? 0);
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
              <SetValueText reps={reps} weight={weight} cardio={cardio} unitClassName="text-neutral-300" />
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
              <SetValueText reps={reps} weight={weight} cardio={cardio} unitClassName="text-neutral-400" />
            </button>
          )}
          {!locked && (
            <button
              type="button"
              data-no-swipe
              onClick={() => setNoteSheetOpen(true)}
              className={cn(
                "-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                // Repère plein dès qu'une note existe (écho du fond permanent de l'icône
                // d'annulation ci-dessous) : sinon rien ne distingue une série notée d'une série
                // qui ne l'est pas tant qu'on n'a pas rouvert la popup pour vérifier.
                set.note
                  ? "bg-accent-soft text-accent-deep hover:brightness-110 active:brightness-95"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              )}
              aria-label={set.note ? "Modifier la note de cette série" : "Ajouter une note à cette série"}
            >
              <StickyNote className="h-4 w-4" />
            </button>
          )}
          {
            // Le verrouillage ne bloque que la saisie (une série ne se remplit que dans l'ordre,
            // voir session-rows.ts) : la suppression, elle, reste possible quelle que soit la
            // position, une série non atteinte n'ayant jamais de résultat à perdre.
          }
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
        </div>
        <SetRecap entries={recap} cardio={cardio} />
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
          cardio={cardio}
        />
      )}

      {noteSheetOpen && (
        <NoteSheet
          title={`Note — Série ${set.setNumber}`}
          initialNote={set.note ?? ""}
          onClose={() => setNoteSheetOpen(false)}
          onSave={(note) => onUpdateNote(set.id, note)}
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

// "10 × 30.00 kg", ou "25 min" pour le cardio (durée rangée dans `reps`, voir isCardio).
export function SetValueText({
  reps,
  weight,
  cardio,
  unitClassName,
}: {
  reps: number;
  weight: number;
  cardio: boolean;
  unitClassName?: string;
}) {
  const unit = cn("text-xs font-normal", unitClassName);
  return cardio ? (
    <>
      {formatReps(reps)} <span className={unit}>min</span>
    </>
  ) : (
    <>
      {formatReps(reps)} <span className={unit}>×</span> {formatWeight(weight)} <span className={unit}>kg</span>
    </>
  );
}
