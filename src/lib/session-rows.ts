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
  exercise: { name: string; muscle: string[]; targetSets: number };
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
// rien fait. Avant ce premier contact, l'historique (ou, à défaut, l'objectif de séries configuré
// sur l'exercice — voir targetSets) sert au contraire à proposer un démarrage rapide (voir
// PreviousSetRow) : un exercice jamais fait affiche déjà ses N séries à blanc plutôt que rien.
export function buildSessionRows(
  group: SessionRowGroup,
  history: PreviousPerformance[],
  touched: boolean
): SessionRow[] {
  const previousPerformance = history[0];
  const previousSets = previousPerformance?.sets ?? [];
  const rowCount = touched
    ? group.sets.length
    : Math.max(group.sets.length, previousSets.length, group.exercise.targetSets);

  return Array.from({ length: rowCount }, (_, i) => i + 1).reduce<SessionRow[]>((acc, setNumber) => {
    const current = group.sets.find((s) => s.setNumber === setNumber);
    const historicalPrevious = previousSets.find((s) => s.setNumber === setNumber);
    const previousRow = acc[acc.length - 1];
    const unlocked = previousRow === undefined || previousRow.current?.completed === true;
    acc.push({
      setNumber,
      current,
      // Une série sans historique ni série en cours reçoit un repère vierge (0/0) plutôt que
      // `undefined` : PreviousSetRow s'appuie sur sa présence dès que `current` est absent (voir
      // ExercisePanel), qu'il y ait ou non un historique réel derrière.
      previous: current ? historicalPrevious : (historicalPrevious ?? { setNumber, actualWeight: null, actualReps: null }),
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
