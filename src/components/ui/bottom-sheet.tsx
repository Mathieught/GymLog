"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";

// Bottom sheet plein écran générique (même famille que ExercisePickerSheet / WorkoutEditSheet) :
// portail sur body, backdrop qui ferme au clic, en-tête avec fermer/retour à gauche, titre au
// centre, `headerActions` (ex : valider) à droite, corps scrollable. `closeIcon` permet à
// l'appelant d'utiliser une flèche retour plutôt qu'une croix quand la popup a été ouverte depuis
// une autre popup (ex : ExercisePickerSheet ouverte depuis WorkoutFormSheet) : `onClose` referme
// alors seulement celle-ci et révèle la popup précédente, donc visuellement un "retour".
export function BottomSheet({
  title,
  closeIcon: CloseIcon = X,
  closeLabel = "Fermer",
  headerActions,
  onClose,
  children,
}: {
  title: string;
  closeIcon?: LucideIcon;
  closeLabel?: string;
  headerActions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-2 py-2.5">
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <span className="flex-1 truncate text-center text-sm font-medium text-neutral-500">
            {title}
          </span>
          <div className="flex items-center justify-end">
            {headerActions ?? <div className="h-9 w-9" />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
