import { cn } from "@/lib/utils";
import type { SessionRowRecapEntry } from "@/lib/session-rows";

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

// Récap de LA MÊME série sur les séances passées (jusqu'à 3), rendu à l'intérieur de la carte de
// la série — jamais un bloc séparé — pour que la comparaison se fasse par position, sans recoller
// mentalement plusieurs séances. Chaque pastille est datée : une séance sans cette série (objectif
// de séries augmenté depuis) garde sa date mais affiche un tiret plutôt qu'un 0×0 trompeur.
export function SetRecap({ entries }: { entries: SessionRowRecapEntry[] }) {
  if (entries.length === 0) return null;

  // neutral-900/10 (pas white/10 : --color-white est le fond sombre de l'app, pas du blanc) pour un
  // filet clair discret, lisible aussi bien sur le fond accent-soft (série faite) que sur les
  // fonds neutres des autres états.
  return (
    <div className="flex gap-1.5 border-t border-neutral-900/10 px-3 pb-2.5 pt-2">
      {entries.map((entry, i) => (
        <div
          key={entry.sessionDate.toISOString()}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-md px-1.5 py-1",
            i === 0 ? "bg-accent-soft" : entry.set ? "bg-neutral-100" : "border border-dashed border-neutral-300"
          )}
        >
          <span className={cn("font-mono text-[10px]", i === 0 ? "text-accent-deep/70" : "text-neutral-500")}>
            {formatSessionDate(entry.sessionDate)}
          </span>
          <span
            className={cn(
              "font-mono text-xs font-semibold tabular-nums",
              i === 0 ? "text-accent-deep" : entry.set ? "text-neutral-600" : "font-medium text-neutral-400"
            )}
          >
            {entry.set ? `${entry.set.actualReps}×${entry.set.actualWeight}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
