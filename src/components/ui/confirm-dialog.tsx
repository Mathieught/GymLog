"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

// Popup de confirmation centrée à l'écran, utilisée à la place de window.confirm() pour rester
// cohérent visuellement avec le reste de l'app. Monté/démonté par l'appelant (pas de prop `open`) :
// annuler ferme sans rien faire, confirmer déclenche l'action puis ferme.
export function ConfirmDialog({
  message,
  confirmLabel = "Supprimer",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Annuler"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-4 shadow-2xl">
        <p className="text-sm text-neutral-700">{message}</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" variant="danger" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
