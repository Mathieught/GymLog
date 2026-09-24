import { cn, formatReps, formatWeight } from "@/lib/utils";
import { setEvolution } from "@/lib/set-evolution";

type HistorySet = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

// Séries d'un exercice dans une séance terminée, avec leur évolution par rapport à la même série
// (même numéro) de la séance de référence. `previous` null = pas de séance de référence : aucun
// badge (≠ une Map vide, où chaque série faite est "Nouvelle"). Partagé entre le détail d'une
// séance de l'historique et l'historique d'un exercice.
export function HistorySetList({
  sets,
  previous,
}: {
  sets: HistorySet[];
  previous: Map<number, { reps: number; weight: number }> | null;
}) {
  return (
    <ul className="mt-1.5">
      {sets.map((set) => {
        const hasValues = set.actualReps != null && set.actualWeight != null;
        return (
          <li
            key={set.id}
            className={cn(
              "grid grid-cols-[22px_1fr_auto] items-center gap-2.5 border-t border-neutral-200 px-2 py-1.5 font-mono tabular-nums",
              !set.completed && "text-neutral-400"
            )}
          >
            <span className="text-xs text-neutral-500">{set.setNumber}</span>
            <span>
              {set.actualReps != null ? formatReps(set.actualReps) : "—"}
              <span className="mx-0.5 text-neutral-500"> × </span>
              {set.actualWeight != null ? formatWeight(set.actualWeight) : "—"}
              <span className="ml-0.5 text-xs text-neutral-500">kg</span>
            </span>
            {!set.completed ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {hasValues ? "Non faite" : "Non saisie"}
              </span>
            ) : (
              previous &&
              hasValues && (
                <span className="flex gap-1">
                  {setEvolution(
                    { reps: set.actualReps!, weight: set.actualWeight! },
                    previous.get(set.setNumber)
                  ).map((badge) => (
                    <span
                      key={badge.label}
                      className={cn(
                        "whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                        badge.tone === "up" && "bg-success-soft text-success",
                        badge.tone === "down" && "bg-danger/15 text-danger",
                        badge.tone === "neutral" && "bg-neutral-100 text-neutral-500"
                      )}
                    >
                      {badge.label}
                    </span>
                  ))}
                </span>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
