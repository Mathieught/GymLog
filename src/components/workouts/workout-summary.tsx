import { Card } from "@/components/ui/card";

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDaysAgo(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / DAY_MS);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
}

export function isWithinDays(date: Date, days: number) {
  return Date.now() - date.getTime() < days * DAY_MS;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </span>
  );
}

export function WorkoutSummary({
  exercises,
  lastSessionDate,
}: {
  exercises: { muscle: string[]; targetSets: number }[];
  lastSessionDate: Date | null;
}) {
  const muscleCounts = new Map<string, number>();
  for (const exercise of exercises) {
    for (const muscle of exercise.muscle) {
      muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1);
    }
  }
  const muscles = [...muscleCounts].sort((a, b) => b[1] - a[1]);
  const maxCount = muscles[0]?.[1] ?? 1;
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex gap-2">
        <Card className="flex flex-1 flex-col gap-1 px-3.5 py-3">
          <Label>Dernière séance</Label>
          <span className="text-xl font-bold tracking-tight text-accent-deep">
            {lastSessionDate ? formatDaysAgo(lastSessionDate) : "Jamais"}
          </span>
          <span className="text-xs text-neutral-600">
            {lastSessionDate
              ? new Intl.DateTimeFormat("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(lastSessionDate)
              : "Pas encore lancée"}
          </span>
        </Card>
        <Card className="flex flex-1 flex-col gap-1 px-3.5 py-3">
          <Label>Exercices</Label>
          <span className="text-xl font-bold tracking-tight">{exercises.length}</span>
          <span className="text-xs text-neutral-600">
            {totalSets} série{totalSets > 1 ? "s" : ""} prévue{totalSets > 1 ? "s" : ""}
          </span>
        </Card>
      </div>

      {muscles.length > 0 && (
        <Card className="space-y-2.5 py-3.5">
          <Label>Groupes musculaires</Label>
          {muscles.map(([muscle, count]) => (
            <div key={muscle} className="flex items-center gap-2.5">
              <span className="w-24 truncate text-sm font-medium">{muscle}</span>
              <div className="h-1.5 flex-1 rounded-full bg-neutral-200">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-[11px] text-neutral-500">
                {count} ex.
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
