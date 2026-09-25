"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppMode } from "@/components/app-mode";
import { WHEEL_HEIGHT, WHEEL_ITEM_HEIGHT, WheelPicker } from "@/components/sessions/wheel-picker";

const REPS_VALUES = Array.from({ length: 101 }, (_, i) => i);
// Mode Avancé : répétition partielle au dixième (00, 10, … 90). i / 10 plutôt que i * 0.1 pour des
// valeurs exactes (0.3 et non 0.30000000000000004), indispensable au indexOf de la molette.
const MICRO_REPS_VALUES = Array.from({ length: 10 }, (_, i) => i / 10);
const WEIGHT_VALUES = Array.from({ length: 1001 }, (_, i) => i);
const MICRO_WEIGHT_VALUES = [0, 0.25, 0.5, 0.75];
const MAX_WEIGHT = 1000;
// Plafond = actualReps max accepté à la synchro (voir validations/sync.ts).
const MINUTES_VALUES = Array.from({ length: 201 }, (_, i) => i);

function formatMicro(value: number) {
  return String(Math.round(value * 100)).padStart(2, "0");
}

// Découpe une valeur en partie entière + cran de molette (arrondi au cran inférieur, pour qu'une
// valeur hors grille garde une molette cohérente). Le Math.round absorbe l'imprécision des
// flottants (10.7 - 10 = 0.6999…).
function splitValue(value: number, microValues: number[]) {
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 100) / 100;
  return [whole, microValues.findLast((v) => v <= fraction) ?? 0] as const;
}

const SEPARATOR_CLASS = "relative z-20 row-start-1 flex items-center font-mono text-base";
const BAND_CLASS =
  "pointer-events-none row-start-1 self-center rounded-lg border border-neutral-300 bg-neutral-100";

// Popup mobile-friendly pour saisir poids/reps : remonte du bas de l'écran, prend 1/4 de la
// hauteur, des molettes qu'on fait défiler pour choisir la valeur — reps (+ décimales au dixième en
// mode Avancé), kg entiers, puis micro-poids au quart de kg.
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
  cardio = false,
}: {
  open: boolean;
  cardio?: boolean;
  label: string;
  weight: number;
  reps: number;
  onChangeWeight: (value: number) => void;
  onChangeReps: (value: number) => void;
  onClose: () => void;
  onValidate: () => void;
}) {
  const advanced = useAppMode().mode === "advanced";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const [wholeWeight, microWeight] = splitValue(weight, MICRO_WEIGHT_VALUES);
  // En Basique, pas de colonne de décimales : la molette des reps affiche la partie entière.
  const [wholeReps, microReps] = advanced ? splitValue(reps, MICRO_REPS_VALUES) : [Math.floor(reps), 0];
  // Colonnes : reps [. décimales] × kg . décimales. `w` = première colonne du poids.
  const w = advanced ? 5 : 3;

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
        {cardio ? (
          // Cardio : une seule molette, la durée en minutes (rangée dans `reps`, voir isCardio).
          <div className="mx-auto w-1/3 px-2 py-2">
            <p className="pb-1 text-center text-[11px] text-neutral-400">minutes</p>
            <div className="relative grid" style={{ height: WHEEL_HEIGHT }}>
              <div aria-hidden className={`${BAND_CLASS} col-start-1`} style={{ height: WHEEL_ITEM_HEIGHT }} />
              <div className="col-start-1 row-start-1">
                <WheelPicker values={MINUTES_VALUES} value={Math.floor(reps)} onChange={onChangeReps} format={String} align="center" />
              </div>
            </div>
          </div>
        ) : (
        /* Une seule grille pour les libellés et les molettes : les séparateurs "×" et "." font lire
            la sélection comme une ligne, ex. "10 × 30.50". Deux bandeaux — reps, puis poids (chacun
            avec ses décimales reliées) — laissent le "×" dehors, entre les deux. Placement en
            gridColumn inline : les numéros de colonne dépendent du mode. */
        <div
          className="grid px-2 py-2"
          style={{
            gridTemplateColumns: advanced
              ? "1fr auto 1fr auto 1fr auto 1fr"
              : "1fr auto 1fr auto 1fr",
          }}
        >
          <p
            className="pb-1 text-center text-[11px] text-neutral-400"
            style={{ gridColumn: `1 / ${w - 1}` }}
          >
            répétitions
          </p>
          <p
            className="pb-1 pr-1 text-right text-[11px] text-neutral-400"
            style={{ gridColumn: w }}
          >
            kg
          </p>
          <div
            className="grid grid-cols-subgrid"
            style={{ gridColumn: "1 / -1", height: WHEEL_HEIGHT }}
          >
            <div
              aria-hidden
              className={BAND_CLASS}
              style={{ gridColumn: `1 / ${w - 1}`, height: WHEEL_ITEM_HEIGHT }}
            />
            <div
              aria-hidden
              className={BAND_CLASS}
              style={{ gridColumn: `${w} / -1`, height: WHEEL_ITEM_HEIGHT }}
            />
            <div className="row-start-1" style={{ gridColumn: 1 }}>
              <WheelPicker
                values={REPS_VALUES}
                value={wholeReps}
                onChange={(v) => onChangeReps(v + microReps)}
                format={String}
                align={advanced ? "right" : "center"}
              />
            </div>
            {advanced && (
              <>
                <span
                  className={`${SEPARATOR_CLASS} px-1.5 font-semibold text-neutral-900`}
                  style={{ gridColumn: 2 }}
                >
                  .
                </span>
                <div className="row-start-1" style={{ gridColumn: 3 }}>
                  <WheelPicker
                    values={MICRO_REPS_VALUES}
                    value={microReps}
                    onChange={(v) => onChangeReps(wholeReps + v)}
                    format={formatMicro}
                    align="left"
                  />
                </div>
              </>
            )}
            <span
              className={`${SEPARATOR_CLASS} px-3 text-neutral-400`}
              style={{ gridColumn: w - 1 }}
            >
              ×
            </span>
            <div className="row-start-1" style={{ gridColumn: w }}>
              <WheelPicker
                values={WEIGHT_VALUES}
                value={wholeWeight}
                onChange={(v) => onChangeWeight(Math.min(MAX_WEIGHT, v + microWeight))}
                format={String}
                align="right"
              />
            </div>
            <span
              className={`${SEPARATOR_CLASS} px-1.5 font-semibold text-neutral-900`}
              style={{ gridColumn: w + 1 }}
            >
              .
            </span>
            <div className="row-start-1" style={{ gridColumn: w + 2 }}>
              <WheelPicker
                values={MICRO_WEIGHT_VALUES}
                value={microWeight}
                onChange={(v) => onChangeWeight(Math.min(MAX_WEIGHT, wholeWeight + v))}
                format={formatMicro}
                align="left"
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>,
    document.body
  );
}
