"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { WheelPicker } from "@/components/sessions/wheel-picker";

const REPS_VALUES = Array.from({ length: 101 }, (_, i) => i);
const WEIGHT_VALUES = Array.from({ length: 601 }, (_, i) => i * 0.5);

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Popup mobile-friendly pour saisir poids/reps : remonte du bas de l'écran, prend 1/4 de la
// hauteur, deux molettes (reps à gauche, poids à droite) qu'on fait défiler pour choisir la valeur.
// Une seule action possible : "Valider" enregistre la série (avec le poids/reps affichés) et la
// marque terminée. Toucher le fond ferme sans rien enregistrer.
export function SetValueSheet({
  open,
  label,
  weight,
  reps,
  onChangeWeight,
  onChangeReps,
  onClose,
  onValidate,
}: {
  open: boolean;
  label: string;
  weight: number;
  reps: number;
  onChangeWeight: (value: number) => void;
  onChangeReps: (value: number) => void;
  onClose: () => void;
  onValidate: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[25vh] min-h-[190px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-500">{label}</span>
          <button
            type="button"
            onClick={onValidate}
            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Valider
          </button>
        </div>
        <div className="flex min-h-0 flex-1 divide-x divide-neutral-100">
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="pt-1 text-center text-[11px] text-neutral-400">répétitions</p>
            <WheelPicker values={REPS_VALUES} value={reps} onChange={onChangeReps} format={String} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="pt-1 text-center text-[11px] text-neutral-400">kg</p>
            <WheelPicker
              values={WEIGHT_VALUES}
              value={weight}
              onChange={onChangeWeight}
              format={formatWeight}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
