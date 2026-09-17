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
  exercise: { name: string; muscle: string[] };
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
//
// `touched` (voir touchedExerciseIds dans session-engine.ts) coupe l'extension par l'historique dès
// que l'exercice a eu au moins une vraie série cette séance : sans ça, supprimer sa dernière série
// la fait aussitôt "réapparaître" grisée sous forme de suggestion, comme si la suppression n'avait
// rien fait. Avant ce premier contact, l'historique sert au contraire à proposer un démarrage
// rapide (voir PreviousSetRow) avec les valeurs de la dernière fois.
export function buildSessionRows(
  group: SessionRowGroup,
  history: PreviousPerformance[],
  touched: boolean
): SessionRow[] {
  const previousPerformance = history[0];
  const previousSets = previousPerformance?.sets ?? [];
  const rowCount = touched ? group.sets.length : Math.max(group.sets.length, previousSets.length);

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
