"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

// Popup d'édition de note — même famille que WorkoutFormSheet (BottomSheet avec un bouton
// "Valider" en en-tête) : réutilisée aussi bien pour la note d'une série en cours (voir SetRow,
// modifiable) que pour celle d'une série passée (voir SetRecap, lecture seule — `onSave` absent :
// seule la séance en cours se modifie, l'historique ne fait que se consulter).
export function NoteSheet({
  title,
  initialNote,
  onClose,
  onSave,
}: {
  title: string;
  initialNote: string;
  onClose: () => void;
  onSave?: (note: string | null) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const readOnly = !onSave;

  function validate() {
    onSave?.(note.trim() || null);
    onClose();
  }

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      headerActions={
        readOnly ? undefined : (
          <button
            type="button"
            onClick={validate}
            aria-label="Valider"
            className="rounded-full bg-accent p-1.5 text-accent-contrast transition-opacity hover:opacity-90"
          >
            <Check className="h-4 w-4" />
          </button>
        )
      }
    >
      <textarea
        autoFocus={!readOnly}
        readOnly={readOnly}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ajouter une note…"
        rows={6}
        maxLength={500}
        className={cn(
          "w-full resize-none rounded-lg border border-neutral-200 p-3 text-sm text-neutral-700 outline-none focus:border-accent",
          readOnly && "bg-neutral-50 text-neutral-500"
        )}
      />
    </BottomSheet>
  );
}
