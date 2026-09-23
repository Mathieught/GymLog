"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { QUICK_SET_COUNTS } from "@/lib/constants";

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
  const isQuickValue = (QUICK_SET_COUNTS as readonly number[]).includes(value);
  const [customMode, setCustomMode] = useState(!isQuickValue);
  // Champ libre : jamais préremplie avec l'ancienne valeur, sinon l'utilisateur doit d'abord
  // l'effacer à la main avant de taper la sienne.
  const [customText, setCustomText] = useState(isQuickValue ? "" : String(value));

  return (
    <div>
      <input type="hidden" id={id} name={name} value={value} />
      <div className="grid grid-cols-4 gap-2">
        {QUICK_SET_COUNTS.map((count) => {
          const selected = !customMode && value === count;
          return (
            <button
              key={count}
              type="button"
              onClick={() => {
                setCustomMode(false);
                onChange(count);
              }}
              aria-pressed={selected}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border text-lg font-semibold transition-colors",
                selected
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-neutral-200 text-neutral-900 hover:border-accent-deep/50 hover:bg-accent-soft/40"
              )}
            >
              {count}
            </button>
          );
        })}

        {/* 10 valeurs rapides sur 4 colonnes laissent 2 cases vides en 3e ligne : le champ
            personnalisé les occupe au lieu d'ajouter une 4e ligne. */}
        {customMode ? (
        <input
          type="number"
          min={1}
          max={50}
          step={1}
          autoFocus
          value={customText}
          onChange={(event) => {
            const text = event.target.value;
            setCustomText(text);
            const parsed = Number(text);
            if (text !== "" && Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          placeholder="Nombre de séries"
          className="col-span-2 h-14 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:border-accent-deep focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setCustomMode(true);
            setCustomText("");
          }}
          className="col-span-2 flex h-14 w-full items-center justify-center rounded-xl border border-neutral-200 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
        >
          Valeur personnalisée
        </button>
      )}
      </div>
    </div>
  );
}
