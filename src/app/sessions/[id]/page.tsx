import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getExerciseHistoryForExercises } from "@/lib/queries/exercise-history";
import { resolveSessionCompletion } from "@/lib/queries/session-status";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SessionTracker, type SessionTrackerGroup } from "@/components/sessions/session-tracker";
import { completeSession } from "@/lib/actions/sessions";

type SetForGrouping = {
  id: string;
  exerciseId: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const { exercise: requestedExerciseId } = await searchParams;

  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: [{ exerciseOrder: "asc" }, { setNumber: "asc" }] },
      workoutTemplate: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!session) notFound();

  const { completedAt, isReadOnly } = await resolveSessionCompletion(session);

  const setsByExercise = new Map<string, SetForGrouping[]>();
  for (const set of session.sets) {
    const list = setsByExercise.get(set.exerciseId) ?? [];
    list.push(set);
    setsByExercise.set(set.exerciseId, list);
  }

  // Les exercices viennent du modèle (source de vérité), pas des séries : un exercice reste
  // visible même tant qu'aucune série n'y a encore été enregistrée (ou après suppression de la
  // dernière).
  const groups: SessionTrackerGroup[] = (session.workoutTemplate?.exercises ?? []).map(
    (workoutExercise, exerciseOrder) => ({
      exerciseId: workoutExercise.exerciseId,
      exerciseOrder,
      exercise: workoutExercise.exercise,
      sets: setsByExercise.get(workoutExercise.exerciseId) ?? [],
    })
  );

  if (groups.length === 0) {
    return (
      <>
        <PageHeader backHref="/history" />
        <Container>
          <h1 className="text-2xl font-semibold">{session.name}</h1>
          <p className="mt-4 text-neutral-500">Aucun exercice dans cette séance.</p>
        </Container>
      </>
    );
  }

  if (isReadOnly && completedAt) {
    return (
      <>
        <PageHeader backHref="/history" />
        <Container>
          <h1 className="text-2xl font-semibold">{session.name}</h1>
          <p className="text-sm text-neutral-500">
            {format(completedAt, "EEEE d MMMM", { locale: fr })}
          </p>

          <div className="mt-6 space-y-4">
            {groups.map((group) => (
              <div key={group.exerciseId}>
                <p className="font-medium">{group.exercise.name}</p>
                <p className="text-xs text-neutral-500">{group.exercise.muscle}</p>

                {group.sets.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">Aucune série enregistrée.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {group.sets.map((set) => (
                      <li
                        key={set.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="text-neutral-500">Série {set.setNumber}</span>
                        <span className="font-medium">
                          {set.actualWeight ?? "—"} kg × {set.actualReps ?? "—"} reps
                        </span>
                        {set.completed && <Check className="h-4 w-4 text-neutral-900" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Container>
      </>
    );
  }

  const activeExerciseId =
    typeof requestedExerciseId === "string" && groups.some((g) => g.exerciseId === requestedExerciseId)
      ? requestedExerciseId
      : groups[0].exerciseId;

  const history = await getExerciseHistoryForExercises(
    session.userId,
    groups.map((g) => g.exerciseId),
    session.id
  );

  return (
    <SessionTracker
      title={session.name}
      basePath={`/sessions/${session.id}`}
      backHref="/history"
      addSetArg={session.id}
      sessionId={session.id}
      groups={groups}
      activeExerciseId={activeExerciseId}
      allowRemove
      history={history}
      headerRight={
        <form action={completeSession.bind(null, session.id)}>
          <ConfirmSubmitButton
            type="submit"
            variant="secondary"
            size="sm"
            confirmMessage="Terminer la séance ? Vous ne pourrez plus modifier les séries après."
          >
            Terminer
          </ConfirmSubmitButton>
        </form>
      }
    />
  );
}
