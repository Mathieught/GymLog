import type { PreviousPerformance } from "@/lib/queries/exercise-history";

export type SessionRowSet = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

export type SessionRowGroup = {
  exerciseId: string;
  exerciseOrder: number;
  exercise: { name: string; muscle: string };
  sets: SessionRowSet[];
};

export type SessionRow = {
  setNumber: number;
  current: SessionRowSet | undefined;
  previous: PreviousPerformance["sets"][number] | undefined;
  recap: { sessionDate: Date; actualWeight: number | null; actualReps: number | null }[];
  unlocked: boolean;
};

// Les séries se remplissent dans l'ordre : une série n'est modifiable que si la précédente a été
// validée (série 1 toujours ouverte). Le plus récent de l'historique sert de suggestion de valeurs
// (prefill) ; l'historique complet (jusqu'à 3 séances) alimente le petit récap sous chaque série.
export function buildSessionRows(group: SessionRowGroup, history: PreviousPerformance[]): SessionRow[] {
  const previousPerformance = history[0];
  const previousSets = previousPerformance?.sets ?? [];
  const rowCount = Math.max(group.sets.length, previousSets.length);

  return Array.from({ length: rowCount }, (_, i) => i + 1).reduce<SessionRow[]>((acc, setNumber) => {
    const current = group.sets.find((s) => s.setNumber === setNumber);
    const previousRow = acc[acc.length - 1];
    const unlocked = previousRow === undefined || previousRow.current?.completed === true;
    acc.push({
      setNumber,
      current,
      previous: previousSets.find((s) => s.setNumber === setNumber),
      recap: history.flatMap((session) => {
        const match = session.sets.find((s) => s.setNumber === setNumber);
        return match
          ? [{ sessionDate: session.sessionDate, actualWeight: match.actualWeight, actualReps: match.actualReps }]
          : [];
      }),
      unlocked,
    });
    return acc;
  }, []);
}
