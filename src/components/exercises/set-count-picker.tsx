"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_SET_COUNTS } from "@/lib/constants";

const MAX_SETS = 50;

// Barre segmentée 1 à 6 (cas courant), dont le "+" bascule sur un stepper −/+ pour les plus
// grandes valeurs, avec un lien pour revenir aux valeurs rapides.
export function SetCountPicker({
  id,
  name,
  value,
  onChange,
}: {
  id?: string;
  name: string;
  value: number;
  onChange: (sets: number) => void;
}) {
  const maxQuick = QUICK_SET_COUNTS[QUICK_SET_COUNTS.length - 1];
  const [stepperMode, setStepperMode] = useState(value > maxQuick);

  return (
    <div>
      <input type="hidden" id={id} name={name} value={value} />

      {stepperMode ? (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-2">
            <button
              type="button"
              onClick={() => onChange(Math.max(1, value - 1))}
              aria-label="Une série de moins"
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-200 transition-colors hover:bg-neutral-300"
            >
              <Minus className="h-6 w-6" />
            </button>
            <div className="text-center">
              <div className="text-4xl font-bold tabular-nums leading-none">{value}</div>
              <div className="mt-1 text-xs text-neutral-500">séries</div>
            </div>
            <button
              type="button"
              onClick={() => onChange(Math.min(MAX_SETS, value + 1))}
              aria-label="Une série de plus"
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-200 transition-colors hover:bg-neutral-300"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setStepperMode(false);
              onChange(Math.min(value, maxQuick));
            }}
            className="mt-2 text-sm font-medium text-accent-deep hover:underline"
          >
            ← Valeurs rapides 1 à {maxQuick}
          </button>
        </>
      ) : (
        <div className="flex gap-1 rounded-2xl border border-neutral-200 p-1">
          {QUICK_SET_COUNTS.map((count) => {
            const selected = value === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => onChange(count)}
                aria-pressed={selected}
                className={cn(
                  "h-12 flex-1 rounded-xl text-lg font-semibold transition-colors",
                  selected
                    ? "bg-accent text-accent-contrast"
                    : "text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {count}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setStepperMode(true);
              onChange(Math.max(value, maxQuick + 1));
            }}
            aria-label="Plus de séries"
            className="flex h-12 flex-1 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
