"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Emplacement réservé pour de futures options d'en-tête (page par page).
// Pour l'instant, juste le style "sélecteur à bulles" sans action réelle.
const PLACEHOLDER_OPTIONS = [0, 1, 2];

export function HeaderOptions() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-neutral-200/70 p-0.5">
      {PLACEHOLDER_OPTIONS.map((index) => (
        <button
          key={index}
          type="button"
          onClick={() => setSelected(index)}
          aria-pressed={selected === index}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            selected === index ? "bg-white shadow-sm" : "hover:bg-white/60"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              selected === index ? "bg-neutral-900" : "bg-neutral-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}
