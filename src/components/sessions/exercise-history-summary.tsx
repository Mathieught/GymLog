import { cn } from "@/lib/utils";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

// Un seul bloc "Dernières fois" par exercice, une ligne par séance passée (jusqu'à 3), toutes ses
// séries regroupées sur cette ligne — remplace l'ancien récap éclaté sous chaque série individuelle
// (une info par exercice consultée une fois, pas répétée à chaque rangée). La meilleure valeur de
// la séance la plus récente ressort en accent : repère immédiat pour savoir si on égale/dépasse la
// dernière fois.
export function ExerciseHistorySummary({ history }: { history: PreviousPerformance[] }) {
  if (history.length === 0) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-neutral-200">
      <p className="px-3.5 pb-2 pt-2.5 font-mono text-[11px] uppercase tracking-wide text-neutral-500">
        Dernières fois
      </p>
      {history.map((performance, i) => (
        <div
          key={performance.sessionDate.toISOString()}
          className="flex items-center gap-3 border-t border-neutral-200 px-3.5 py-2 font-mono text-sm tabular-nums"
        >
          <span className={cn("w-9 shrink-0", i === 0 ? "text-neutral-900" : "text-neutral-500")}>
            {formatSessionDate(performance.sessionDate)}
          </span>
          <span className="flex flex-1 flex-wrap gap-2 text-neutral-700">
            {performance.sets.map((set, setIndex) => (
              <span key={setIndex} className={i === 0 && setIndex === 0 ? "font-semibold text-accent-deep" : undefined}>
                {set.actualReps}×{set.actualWeight}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
