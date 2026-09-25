"use client";

import { cn } from "@/lib/utils";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import { ExerciseMuscleIcon } from "@/components/exercises/muscle-group-picker";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

// Rail de progression affiché en permanence sous l'en-tête : une colonne par exercice, l'icône de
// son groupe musculaire au-dessus d'une barre d'état — on voit d'un coup d'œil ce que contient la
// séance et où on en est. Chaque colonne est tappable pour sauter directement à l'exercice, sans
// passer par le swipe. L'état "fait" utilise `buildSessionRows(..., 0)` (comme le prompt de fin de
// séance) pour tenir compte des séries encore seulement suggérées par l'historique/l'objectif, pas
// seulement des séries réellement enregistrées.

// Icônes posées directement sur le fond de page (pas de vignette) : silhouette et zone ciblée
// sont des mélanges de accent-deep et du fond (neutral-50), plus ou moins dilués selon l'état.
// Les états jouent sur la teinte plutôt que sur l'opacité, qui rendait les exercices à venir
// illisibles en mode clair.
const RAIL_TONES = {
  active: "text-[color:color-mix(in_srgb,var(--accent-deep)_50%,var(--n-50))]",
  done:
    "text-[color:color-mix(in_srgb,var(--accent-deep)_38%,var(--n-50))] [&_.fill-accent-deep]:fill-[color-mix(in_srgb,var(--accent-deep)_80%,var(--n-50))]",
  todo:
    "text-[color:color-mix(in_srgb,var(--accent-deep)_22%,var(--n-50))] [&_.fill-accent-deep]:fill-[color-mix(in_srgb,var(--accent-deep)_50%,var(--n-50))]",
};

export function SessionProgressRail({
  groups,
  history,
  activeIndex,
  onSelect,
}: {
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const active = groups[activeIndex];

  return (
    // Même colonne padded (px-4) que la ligne titre au-dessus et que le contenu en dessous : le
    // rail bord-à-bord dépassait de cette colonne sur les côtés (visible comme "désaligné"/qui
    // "sort" sur un écran étroit), il reste maintenant dans le même alignement à toute largeur.
    <div className="flex flex-col gap-2 px-4">
      <div className="flex gap-1">
        {groups.map((group, index) => {
          const rows = buildSessionRows(group, history[group.exerciseId] ?? [], 0);
          const isDone = rows.length > 0 && rows.every((row) => row.current?.completed === true);
          const isActive = index === activeIndex;

          return (
            <button
              key={group.exerciseId}
              type="button"
              onClick={() => onSelect(index)}
              title={group.exercise.name}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Aller à l'exercice ${index + 1} : ${group.exercise.name}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 pt-1"
            >
              <ExerciseMuscleIcon
                muscles={group.exercise.muscle}
                className={cn(
                  "h-[22px] w-[22px]",
                  isActive ? "h-6 w-6 " + RAIL_TONES.active : isDone ? RAIL_TONES.done : RAIL_TONES.todo
                )}
              />
              <span
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  isActive ? "bg-neutral-900" : isDone ? "bg-accent" : "bg-neutral-300"
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="flex justify-between gap-3 font-mono text-xs text-neutral-500">
        <span className="shrink-0">
          Exercice <span className="font-semibold text-neutral-900">{activeIndex + 1}</span>/{groups.length}
        </span>
        <span className="truncate">{active?.exercise.muscle.join(", ")}</span>
      </p>
    </div>
  );
}
