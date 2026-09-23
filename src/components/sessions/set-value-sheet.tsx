"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { WHEEL_HEIGHT, WHEEL_ITEM_HEIGHT, WheelPicker } from "@/components/sessions/wheel-picker";

const REPS_VALUES = Array.from({ length: 101 }, (_, i) => i);
const WEIGHT_VALUES = Array.from({ length: 1001 }, (_, i) => i);
const MICRO_WEIGHT_VALUES = [0, 0.25, 0.5, 0.75];
const MAX_WEIGHT = 1000;

function formatMicroWeight(value: number) {
  return String(value * 100).padStart(2, "0");
}

// Popup mobile-friendly pour saisir poids/reps : remonte du bas de l'écran, prend 1/4 de la
// hauteur, trois molettes (reps, kg entiers, micro-poids au quart de kg) qu'on fait défiler pour
// choisir la valeur.
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

  const wholeWeight = Math.floor(weight);
  // Arrondi au quart inférieur : un ancien poids hors grille garde une molette cohérente.
  const microWeight = Math.floor((weight - wholeWeight) * 4) / 4;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-500">{label}</span>
          <button
            type="button"
            onClick={onValidate}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast hover:brightness-95"
          >
            Valider
          </button>
        </div>
        {/* Une seule grille pour les libellés et les molettes : les séparateurs "×" et "." font lire
            la sélection comme une ligne, ex. "10 × 30.50". Deux bandeaux — reps, puis poids (kg +
            décimales reliés) — laissent le "×" dehors, entre les deux. */}
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] px-2 py-2">
          <p className="pb-1 text-center text-[11px] text-neutral-400">répétitions</p>
          <span />
          <p className="pb-1 pr-1 text-right text-[11px] text-neutral-400">kg</p>
          <span />
          <span />
          <div className="col-span-5 grid grid-cols-subgrid" style={{ height: WHEEL_HEIGHT }}>
            <div
              aria-hidden
              className="pointer-events-none col-start-1 row-start-1 self-center rounded-lg border border-neutral-300 bg-neutral-100"
              style={{ height: WHEEL_ITEM_HEIGHT }}
            />
            <div
              aria-hidden
              className="pointer-events-none col-span-3 col-start-3 row-start-1 self-center rounded-lg border border-neutral-300 bg-neutral-100"
              style={{ height: WHEEL_ITEM_HEIGHT }}
            />
            <div className="col-start-1 row-start-1">
              <WheelPicker values={REPS_VALUES} value={reps} onChange={onChangeReps} format={String} />
            </div>
            <span className="relative z-20 col-start-2 row-start-1 flex items-center px-3 font-mono text-base text-neutral-400">
              ×
            </span>
            <div className="col-start-3 row-start-1">
              <WheelPicker
                values={WEIGHT_VALUES}
                value={wholeWeight}
                onChange={(v) => onChangeWeight(Math.min(MAX_WEIGHT, v + microWeight))}
                format={String}
                align="right"
              />
            </div>
            <span className="relative z-20 col-start-4 row-start-1 flex items-center px-1.5 font-mono text-base font-semibold text-neutral-900">
              .
            </span>
            <div className="col-start-5 row-start-1">
              <WheelPicker
                values={MICRO_WEIGHT_VALUES}
                value={microWeight}
                onChange={(v) => onChangeWeight(Math.min(MAX_WEIGHT, wholeWeight + v))}
                format={formatMicroWeight}
                align="left"
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
