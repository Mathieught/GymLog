"use client";

import { cn } from "@/lib/utils";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

// Remplace l'ancien fil d'icônes purement informatif (SessionExerciseStepper, qui disparaissait
// 1,5s après un changement d'exercice) : une barre de segments reste affichée en permanence sous
// l'en-tête, et chaque segment est tappable pour sauter directement à l'exercice correspondant,
// sans passer par le swipe. L'état "fait" utilise `buildSessionRows(..., 0)` (comme le prompt de
// fin de séance) pour tenir compte des séries encore seulement suggérées par l'historique/
// l'objectif, pas seulement des séries réellement enregistrées.
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
    <div className="flex flex-col gap-2">
      {/* Bord à bord (pas de px-4) : contrairement à la ligne titre au-dessus, le rail profite de
          toute la largeur de l'écran plutôt que de rester cantonné à la colonne de contenu. */}
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
              className={cn(
                "h-1 flex-1 transition-colors",
                index === 0 && "rounded-l-full",
                index === groups.length - 1 && "rounded-r-full",
                isActive ? "bg-neutral-900" : isDone ? "bg-accent" : "bg-neutral-300"
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between px-4 font-mono text-xs text-neutral-500">
        <span>
          Exercice <span className="font-semibold text-neutral-900">{activeIndex + 1}</span>/{groups.length}
        </span>
        <span className="text-accent-deep">toucher pour naviguer</span>
      </div>
    </div>
  );
}
