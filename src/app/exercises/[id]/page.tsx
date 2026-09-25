import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { tz } from "@date-fns/tz";
import { ChevronRight, ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { getExerciseDetail } from "@/lib/queries/exercises";
import { parseTimeZone, TIME_ZONE_COOKIE } from "@/lib/time-zone";
import { WEEKDAYS } from "@/lib/constants";
import { cn, formatDaysAgo, formatReps, formatSetCount, formatWeight } from "@/lib/utils";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ExerciseEditTrigger } from "@/components/exercises/exercise-edit-trigger";
import { ExerciseDeleteButton } from "@/components/exercises/exercise-delete-button";
import { ExerciseNote } from "@/components/exercises/exercise-note";
import { MUSCLE_ICONS } from "@/components/exercises/muscle-group-picker";
import { HistorySetList } from "@/components/sessions/history-set-list";

// Séances affichées d'emblée dans l'historique ; les plus anciennes restent repliées dessous.
const VISIBLE_HISTORY = 3;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function ExerciseDetailPage({
  params,
}: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const exercise = await getExerciseDetail(id);
  if (!exercise || exercise.isArchived) notFound();

  const userId = await getCurrentUserId();
  const [workoutExercises, sessions, cookieStore] = await Promise.all([
    prisma.workoutExercise.findMany({
      where: { exerciseId: id, workoutTemplate: { userId, isArchived: false } },
      orderBy: { workoutTemplate: { order: "asc" } },
      select: {
        targetSets: true,
        workoutTemplate: {
          select: { id: true, name: true, schedules: { select: { dayOfWeek: true } } },
        },
      },
    }),
    // Séances terminées où l'exercice a au moins une série, de la plus récente à la plus ancienne.
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null }, sets: { some: { exerciseId: id } } },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        sets: {
          where: { exerciseId: id },
          orderBy: { setNumber: "asc" },
          select: { id: true, setNumber: true, actualWeight: true, actualReps: true, completed: true },
        },
      },
    }),
    cookies(),
  ]);

  // Un exercice présent deux fois dans la même séance n'y compte qu'une fois.
  const templates = [...new Map(workoutExercises.map((we) => [we.workoutTemplate.id, we])).values()];

  // Séries faites et renseignées : seules comparables d'une séance à l'autre (comme le détail
  // d'une séance de l'historique).
  const doneSets = (session: (typeof sessions)[number]) =>
    session.sets.filter((set) => set.completed && set.actualWeight != null && set.actualReps != null);
  // Meilleure série = la plus lourde, départagée par le nombre de reps.
  const best = sessions
    .flatMap(doneSets)
    .reduce<{ weight: number; reps: number } | null>((acc, set) => {
      const candidate = { weight: set.actualWeight!, reps: set.actualReps! };
      if (!acc || candidate.weight > acc.weight || (candidate.weight === acc.weight && candidate.reps > acc.reps)) {
        return candidate;
      }
      return acc;
    }, null);
  const last = sessions[0];

  // Dates dans le fuseau de l'utilisateur (rendu serveur en UTC sur Vercel).
  const zone = tz(parseTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value));
  const Icon = MUSCLE_ICONS[exercise.muscle[0] as keyof typeof MUSCLE_ICONS];

  const historyCard = (session: (typeof sessions)[number], index: number) => {
    // Référence : la séance précédente où l'exercice a été fait (la suivante dans la liste).
    const previous = sessions[index + 1];
    return (
      <Card key={session.id} className="px-3.5 py-3">
        <Link href={`/sessions/${session.id}`} className="flex items-baseline gap-2">
          <span className="font-semibold">
            {capitalize(format(session.startedAt, "EEEE d MMM", { locale: fr, in: zone }))}
          </span>
          <span className="min-w-0 truncate text-xs text-neutral-500">{session.name}</span>
          <span className="ml-auto font-mono text-[11px] text-neutral-500">
            {session.sets.filter((set) => set.completed).length}/{session.sets.length}
          </span>
        </Link>
        <HistorySetList
          sets={session.sets}
          previous={
            new Map(
              (previous ? doneSets(previous) : []).map((set) => [
                set.setNumber,
                { reps: set.actualReps!, weight: set.actualWeight! },
              ])
            )
          }
        />
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        backHref="/exercises"
        title={exercise.name}
        right={
          <>
            <ExerciseEditTrigger
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              defaultValues={exercise}
            />
            <ExerciseDeleteButton exerciseId={exercise.id} exerciseName={exercise.name} />
          </>
        }
      />
      <Container className="space-y-6">
        <Card className="space-y-3.5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-21 w-21 shrink-0 items-center justify-center rounded-2xl bg-muscle-tile text-muscle">
              {Icon && <Icon className="h-16 w-16" />}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscle.map((muscle, i) => (
                  <span
                    key={muscle}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[13px]",
                      i === 0
                        ? "bg-accent font-semibold text-accent-contrast"
                        : "border border-neutral-300 text-neutral-600"
                    )}
                  >
                    {muscle}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-neutral-500">
                Objectif à l&apos;ajout :{" "}
                <span className="font-semibold text-neutral-900">{formatSetCount(exercise.targetSets)}</span>
              </p>
            </div>
          </div>
          <ExerciseNote exerciseId={exercise.id} note={exercise.description} />
        </Card>

        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-neutral-100 p-3">
            <dt className="text-[11px] text-neutral-500">Pratiqué</dt>
            <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{sessions.length}</dd>
            <dd className="text-[11px] text-neutral-500">fois</dd>
          </div>
          <div className="rounded-2xl bg-neutral-100 p-3">
            <dt className="text-[11px] text-neutral-500">Meilleure série</dt>
            {best ? (
              <>
                <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-accent-deep">
                  {formatWeight(best.weight)}
                  <span className="text-xs"> kg</span>
                </dd>
                <dd className="font-mono text-[11px] text-neutral-500">× {formatReps(best.reps)} reps</dd>
              </>
            ) : (
              <dd className="mt-1 font-mono text-xl font-semibold text-neutral-400">—</dd>
            )}
          </div>
          <div className="rounded-2xl bg-neutral-100 p-3">
            <dt className="text-[11px] text-neutral-500">Dernière fois</dt>
            {last ? (
              <>
                <dd className="mt-1 font-semibold">{formatDaysAgo(last.startedAt)}</dd>
                <dd className="truncate text-[11px] text-neutral-500">{last.name}</dd>
              </>
            ) : (
              <dd className="mt-1 font-semibold text-neutral-400">Jamais</dd>
            )}
          </div>
        </dl>

        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Dans vos séances</h2>
            <span className="font-mono text-xs text-neutral-500">
              {templates.length} séance{templates.length > 1 ? "s" : ""}
            </span>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-neutral-500">Cet exercice n&apos;est dans aucune séance.</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {templates.map(({ targetSets, workoutTemplate }) => {
                const days = WEEKDAYS.filter((day) =>
                  workoutTemplate.schedules.some((s) => s.dayOfWeek === day.value)
                ).map((day) => day.label.slice(0, 3));
                return (
                  <li key={workoutTemplate.id} className="border-b border-neutral-200 last:border-b-0">
                    <Link
                      href={`/workouts/${workoutTemplate.id}`}
                      className="flex min-h-11 items-center gap-3 px-3.5 py-3 transition-colors hover:bg-neutral-100"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-600">
                        <ListChecks className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{workoutTemplate.name}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {[...days, `${targetSets} série${targetSets > 1 ? "s" : ""} prévue${targetSets > 1 ? "s" : ""}`].join(" · ")}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Historique</h2>
            {sessions.length > 0 && (
              <span className="font-mono text-xs text-neutral-500">vs séance précédente</span>
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucune séance terminée avec cet exercice pour l&apos;instant.</p>
          ) : (
            <>
              {sessions.slice(0, VISIBLE_HISTORY).map((session, i) => historyCard(session, i))}
              {sessions.length > VISIBLE_HISTORY && (
                <details className="group space-y-2.5">
                  <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center px-4 text-sm font-medium text-accent-deep group-open:hidden">
                    Voir tout l&apos;historique ({sessions.length})
                  </summary>
                  {sessions
                    .slice(VISIBLE_HISTORY)
                    .map((session, i) => historyCard(session, i + VISIBLE_HISTORY))}
                </details>
              )}
            </>
          )}
        </section>
      </Container>
    </>
  );
}
