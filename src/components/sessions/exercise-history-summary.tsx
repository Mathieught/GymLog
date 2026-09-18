import type { PreviousPerformance } from "@/lib/queries/exercise-history";

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

// Un seul bloc "Dernières fois" par exercice, une ligne par séance passée (jusqu'à 3), toutes ses
// séries regroupées sur cette ligne — remplace l'ancien récap éclaté sous chaque série individuelle
// (une info par exercice consultée une fois, pas répétée à chaque rangée).
export function ExerciseHistorySummary({ history }: { history: PreviousPerformance[] }) {
  if (history.length === 0) return null;

  return (
    <div className="mb-4 space-y-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
      <p className="text-xs font-medium text-neutral-500">Dernières fois</p>
      <ul className="space-y-1">
        {history.map((performance, i) => (
          <li
            key={performance.sessionDate.toISOString()}
            className={`flex items-baseline gap-2 font-mono text-sm tabular-nums ${
              i === 0 ? "text-neutral-700" : "text-neutral-400"
            }`}
          >
            <span className="w-10 shrink-0 text-xs">{formatSessionDate(performance.sessionDate)}</span>
            <span className="flex-1">
              {performance.sets.map((set, setIndex) => (
                <span key={setIndex}>
                  {setIndex > 0 && <span className="text-neutral-300"> · </span>}
                  {set.actualReps}
                  <span className="text-xs">×</span>
                  {set.actualWeight}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
