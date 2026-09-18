"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

// Remplace l'ancien fil d'icônes purement informatif (SessionExerciseStepper) : ce rail reste
// affiché en permanence dans le header (plus de disparition après quelques secondes) et chaque
// segment est tappable pour sauter directement à l'exercice correspondant, sans passer par le
// swipe. L'état "fait" utilise `buildSessionRows(..., 0)` (comme le prompt de fin de séance) pour
// tenir compte des séries encore seulement suggérées par l'historique/l'objectif, pas seulement
// des séries réellement enregistrées.
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
  return (
    <ol className="flex flex-shrink-0 flex-row items-center gap-1">
      {groups.map((group, index) => {
        const rows = buildSessionRows(group, history[group.exerciseId] ?? [], 0);
        const isDone = rows.length > 0 && rows.every((row) => row.current?.completed === true);
        const isActive = index === activeIndex;

        return (
          <li key={group.exerciseId} className="flex flex-row items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(index)}
              title={group.exercise.name}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums transition-all",
                isActive
                  ? "scale-110 bg-accent text-accent-contrast shadow-sm"
                  : isDone
                    ? "bg-accent-soft text-accent-deep"
                    : "bg-neutral-100 text-neutral-400"
              )}
            >
              {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </button>
            {index < groups.length - 1 && <div className="h-px w-3 bg-neutral-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
