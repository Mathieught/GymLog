import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { LocalExercise } from "@/lib/offline/types";

export type SessionRowSet = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

export type SessionRowGroup = {
  exerciseId: string;
  exerciseOrder: number;
  exercise: LocalExercise;
  sets: SessionRowSet[];
  // Numéros (dans l'historique) des séries suggérées supprimées avant d'être renseignées (voir
  // dismissSuggestion dans session-engine.ts) : les suggestions suivantes remontent d'un cran en
  // gardant leurs propres valeurs.
  skippedSuggestions?: number[];
};

// Une entrée de récap par séance passée (jusqu'à 3), datée, pour LE MÊME numéro de série que la
// ligne qui la porte — `set` est `undefined` quand cette séance-là n'avait pas encore cette série
// (objectif de séries augmenté depuis), distinct d'une valeur 0×0.
export type SessionRowRecapEntry = {
  sessionDate: Date;
  set: PreviousPerformance["sets"][number] | undefined;
};

export type SessionRow = {
  setNumber: number;
  current: SessionRowSet | undefined;
  previous: PreviousPerformance["sets"][number] | undefined;
  unlocked: boolean;
  recap: SessionRowRecapEntry[];
};

// Les séries se remplissent dans l'ordre : une série n'est modifiable que si la précédente a été
// validée (série 1 toujours ouverte) — SAUF si elle a elle-même déjà un résultat : le verrouillage
// ne sert qu'à empêcher de saisir une série pas encore atteinte hors ordre, pas à cacher une série
// déjà renseignée. Sans cette exception, annuler le résultat d'une série antérieure grise aussitôt
// toutes les séries suivantes déjà validées — leur valeur reste intacte, mais elles ont l'air
// d'avoir disparu. Le plus récent de l'historique sert de suggestion de valeurs
// (prefill) ; le récap (jusqu'à 3 séances) est calculé par série — même numéro de série d'une
// séance à l'autre — et rendu directement sous chaque ligne (voir SetRow/PreviousSetRow), pas dans
// un bloc séparé.
//
// Au-delà des séries réelles, on propose jusqu'à `Math.max(historique, objectif de séries)` séries
// suggérées (voir PreviousSetRow) pour démarrer rapidement — un exercice jamais fait affiche déjà
// ses N séries cibles à blanc plutôt que rien. `removedCount` (voir removedSetCounts dans
// session-engine.ts) réduit d'autant ce nombre de suggestions : sans ça, supprimer une série la
// ferait aussitôt réapparaître grisée, comme si la suppression n'avait rien fait. Il ne réduit que
// le nombre de suggestions encore proposées — jamais les séries réelles déjà entrées, ni les
// suggestions des AUTRES séries pas encore touchées du même exercice.
export function buildSessionRows(
  group: SessionRowGroup,
  history: PreviousPerformance[],
  removedCount: number
): SessionRow[] {
  const previousPerformance = history[0];
  const previousSets = previousPerformance?.sets ?? [];
  const maxSuggested = Math.max(previousSets.length, group.exercise.targetSets);
  // Numéro de série "source" (historique/objectif) de chaque ligne, une fois retirées les
  // suggestions supprimées : la ligne N reprend les valeurs et le récap de sources[N - 1].
  const skipped = group.skippedSuggestions ?? [];
  const sources = Array.from({ length: maxSuggested }, (_, i) => i + 1).filter((n) => !skipped.includes(n));
  const extraSuggested = Math.max(0, sources.length - group.sets.length - removedCount);
  const rowCount = group.sets.length + extraSuggested;

  return Array.from({ length: rowCount }, (_, i) => i + 1).reduce<SessionRow[]>((acc, setNumber) => {
    const current = group.sets.find((s) => s.setNumber === setNumber);
    const sourceNumber = sources[setNumber - 1];
    const historicalPrevious = previousSets.find((s) => s.setNumber === sourceNumber);
    const previousRow = acc[acc.length - 1];
    const unlocked =
      previousRow === undefined || previousRow.current?.completed === true || current?.completed === true;
    acc.push({
      setNumber,
      current,
      // Une série sans historique ni série en cours reçoit un repère vierge (0/0) plutôt que
      // `undefined` : PreviousSetRow s'appuie sur sa présence dès que `current` est absent (voir
      // ExercisePanel), qu'il y ait ou non un historique réel derrière.
      previous: current
        ? historicalPrevious
        : (historicalPrevious ?? { setNumber: sourceNumber ?? setNumber, actualWeight: null, actualReps: null, note: null }),
      unlocked,
      recap: history.map((performance) => ({
        sessionDate: performance.sessionDate,
        set: performance.sets.find((s) => s.setNumber === sourceNumber),
      })),
    });
    return acc;
  }, []);
}
