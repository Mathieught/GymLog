import type { ReactNode } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { ExerciseSwipeNav } from "@/components/sessions/exercise-swipe-nav";
import { SetRow } from "@/components/sessions/set-row";
import { PreviousSetRow } from "@/components/sessions/previous-set-row";
import { SetHistoryRecap } from "@/components/sessions/set-history-recap";
import { addSet } from "@/lib/actions/sessions";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

export type SessionTrackerSet = {
  id: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

export type SessionTrackerGroup = {
  exerciseId: string;
  exerciseOrder: number;
  exercise: { name: string; muscle: string };
  sets: SessionTrackerSet[];
};

export function SessionTracker({
  title,
  basePath,
  backHref,
  addSetArg,
  groups,
  activeExerciseId,
  allowRemove,
  headerRight,
  history,
}: {
  title: string;
  basePath: string;
  backHref: string;
  addSetArg: string;
  groups: SessionTrackerGroup[];
  activeExerciseId: string;
  allowRemove: boolean;
  headerRight?: ReactNode;
  history?: PreviousPerformance[];
}) {
  const activeIndex = groups.findIndex((g) => g.exerciseId === activeExerciseId);
  const activeGroup = groups[activeIndex];
  const prevGroup = groups[activeIndex - 1];
  const nextGroup = groups[activeIndex + 1];

  // Le plus récent sert de suggestion de valeurs (prefill) ; l'historique complet (jusqu'à 3
  // séances) alimente le petit récap affiché sous chaque série.
  const previousPerformance = history?.[0];
  const previousSets = previousPerformance?.sets ?? [];
  const rowCount = Math.max(activeGroup.sets.length, previousSets.length);
  // Les séries se remplissent dans l'ordre : une série n'est modifiable que si la précédente a
  // été validée (série 1 toujours ouverte).
  const rows = Array.from({ length: rowCount }, (_, i) => i + 1).reduce<
    Array<{
      setNumber: number;
      current: SessionTrackerSet | undefined;
      previous: PreviousPerformance["sets"][number] | undefined;
      recap: { sessionDate: Date; actualWeight: number | null; actualReps: number | null }[];
      unlocked: boolean;
    }>
  >((acc, setNumber) => {
    const current = activeGroup.sets.find((s) => s.setNumber === setNumber);
    const previousRow = acc[acc.length - 1];
    const unlocked = previousRow === undefined || previousRow.current?.completed === true;
    acc.push({
      setNumber,
      current,
      previous: previousSets.find((s) => s.setNumber === setNumber),
      recap: (history ?? []).flatMap((session) => {
        const match = session.sets.find((s) => s.setNumber === setNumber);
        return match
          ? [
              {
                sessionDate: session.sessionDate,
                actualWeight: match.actualWeight,
                actualReps: match.actualReps,
              },
            ]
          : [];
      }),
      unlocked,
    });
    return acc;
  }, []);

  return (
    <>
      <PageHeader backHref={backHref} className="max-w-2xl" />
      <Container className="max-w-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          {headerRight}
        </div>

        <ExerciseSwipeNav basePath={basePath} groups={groups} activeExerciseId={activeExerciseId}>
          <div className="mb-3">
            <p className="font-medium">{activeGroup.exercise.name}</p>
            <p className="text-sm text-neutral-500">{activeGroup.exercise.muscle}</p>
          </div>

          {previousPerformance && previousPerformance.sets.length > 0 && (
            <p className="mb-2 text-xs text-neutral-400">
              Dernière fois · {format(previousPerformance.sessionDate, "EEEE d MMMM", { locale: fr })}
            </p>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucune série pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) =>
                row.current ? (
                  <li key={row.current.id}>
                    <SetRow
                      set={row.current}
                      canRemove={allowRemove}
                      previousSet={row.previous}
                      locked={!row.unlocked}
                    />
                    <SetHistoryRecap entries={row.recap} />
                  </li>
                ) : (
                  <li key={`previous-${row.setNumber}`}>
                    <PreviousSetRow
                      previousSet={row.previous!}
                      addSetArg={addSetArg}
                      exerciseId={activeGroup.exerciseId}
                      exerciseOrder={activeGroup.exerciseOrder}
                      locked={!row.unlocked}
                    />
                    <SetHistoryRecap entries={row.recap} />
                  </li>
                )
              )}
            </ul>
          )}

          <form
            action={addSet.bind(null, addSetArg, activeGroup.exerciseId, activeGroup.exerciseOrder)}
            className="mt-3"
          >
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              + Ajouter une série
            </Button>
          </form>

          <div className="mt-6 flex justify-between">
            {prevGroup ? (
              <ButtonLink href={`${basePath}?exercise=${prevGroup.exerciseId}`} variant="ghost" size="sm">
                ← Précédent
              </ButtonLink>
            ) : (
              <span />
            )}
            {nextGroup ? (
              <ButtonLink href={`${basePath}?exercise=${nextGroup.exerciseId}`} variant="ghost" size="sm">
                Suivant →
              </ButtonLink>
            ) : (
              <span />
            )}
          </div>
        </ExerciseSwipeNav>
      </Container>
    </>
  );
}
