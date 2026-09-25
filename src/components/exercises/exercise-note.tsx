"use client";

import { useOptimistic, useState, useTransition } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { NoteSheet } from "@/components/sessions/note-sheet";
import { updateExerciseNote } from "@/lib/actions/exercises";

// Note de l'exercice sur sa fiche : modifiable sur place (crayon, ou « Ajouter une note » si vide)
// via la même popup que la note de série, sans rouvrir tout le formulaire d'édition.
export function ExerciseNote({ exerciseId, note }: { exerciseId: string; note: string | null }) {
  const [open, setOpen] = useState(false);
  const [optimisticNote, setOptimisticNote] = useOptimistic(note);
  const [, startTransition] = useTransition();

  function save(next: string | null) {
    startTransition(async () => {
      setOptimisticNote(next);
      await updateExerciseNote(exerciseId, next);
    });
  }

  return (
    <>
      {optimisticNote ? (
        <div className="border-t border-neutral-200 pt-1.5">
          <div className="flex items-center gap-2 text-neutral-500">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">Note</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Modifier la note"
              className="-mr-2 ml-auto flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 hover:text-neutral-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{optimisticNote}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Ajouter une note
        </button>
      )}

      {open && (
        <NoteSheet
          title="Note de l'exercice"
          initialNote={optimisticNote ?? ""}
          onClose={() => setOpen(false)}
          onSave={save}
        />
      )}
    </>
  );
}
