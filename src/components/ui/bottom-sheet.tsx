"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Bottom sheet plein écran générique (même famille que ExercisePickerSheet / WorkoutEditSheet) :
// portail sur body, backdrop qui ferme au clic, en-tête avec titre + croix, corps scrollable.
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
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
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[95vh] flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-500">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
