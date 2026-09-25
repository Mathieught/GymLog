import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { tz } from "@date-fns/tz";
import { cookies } from "next/headers";
import { ArrowLeftRight, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HistorySetList } from "@/components/sessions/history-set-list";
import { parseTimeZone, TIME_ZONE_COOKIE } from "@/lib/time-zone";
import { getSessionExerciseData } from "@/lib/queries/exercise-history";
import { resolveSessionCompletion } from "@/lib/queries/session-status";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import { variantOfSlot, type SessionRowGroup } from "@/lib/session-rows";

type SetForGrouping = {
  id: string;
  exerciseId: string;
  substituteForId: string | null;
  exercise: { name: string };
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// "1 h 08" au-delà d'une heure, "45 min" en dessous.
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const { exercise: requestedExerciseId } = await searchParams;

  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      sets: {
        orderBy: [{ exerciseOrder: "asc" }, { setNumber: "asc" }],
        include: { exercise: { select: { name: true } } },
      },
      workoutTemplate: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!session) notFound();

  const { completedAt, isReadOnly } = await resolveSessionCompletion(session);

  const setsByExercise = new Map<string, SetForGrouping[]>();
  // Une série faite sur une variante reste rangée à la place de l'exercice prévu.
  for (const set of session.sets) {
    const slotId = set.substituteForId ?? set.exerciseId;
    const list = setsByExercise.get(slotId) ?? [];
    list.push(set);
    setsByExercise.set(slotId, list);
  }

  // Les exercices viennent du modèle (source de vérité), pas des séries : un exercice reste
  // visible même tant qu'aucune série n'y a encore été enregistrée (ou après suppression de la
  // dernière).
  const groups = (session.workoutTemplate?.exercises ?? []).map((workoutExercise, exerciseOrder) => {
    const sets = setsByExercise.get(workoutExercise.exerciseId) ?? [];
    return {
      exerciseId: workoutExercise.exerciseId,
      exerciseOrder,
      // Nombre de séries figé dans la séance (voir WorkoutExercise.targetSets), pas celui de l'exercice.
      exercise: { ...workoutExercise.exercise, targetSets: workoutExercise.targetSets },
      sets,
      variantId: variantOfSlot(sets, workoutExercise.exerciseId),
    } satisfies SessionRowGroup;
  });

  if (groups.length === 0) {
    return (
      <>
        <PageHeader backHref="/history" />
        <Container>
          <h1 className="text-xl font-semibold">{session.name}</h1>
          <p className="mt-4 text-neutral-500">Aucun exercice dans cette séance.</p>
        </Container>
      </>
    );
  }

  if (isReadOnly && completedAt) {
    // Séance précédente du même modèle, pour comparer chaque série à celle de même numéro.
    const previousSession = session.workoutTemplateId
      ? await prisma.workoutSession.findFirst({
          where: {
            userId: session.userId,
            workoutTemplateId: session.workoutTemplateId,
            completedAt: { not: null },
            startedAt: { lt: session.startedAt },
          },
          orderBy: { startedAt: "desc" },
          select: {
            name: true,
            startedAt: true,
            sets: {
              where: { completed: true, actualWeight: { not: null }, actualReps: { not: null } },
              select: { exerciseId: true, setNumber: true, actualWeight: true, actualReps: true },
            },
          },
        })
      : null;
    // Séries de référence d'un exercice, par numéro de série (null sans séance précédente).
    const previousSetsFor = (exerciseId: string) =>
      previousSession
        ? new Map(
            previousSession.sets
              .filter((set) => set.exerciseId === exerciseId)
              .map((set) => [set.setNumber, { reps: set.actualReps!, weight: set.actualWeight! }])
          )
        : null;

    // Dates et heures dans le fuseau de l'utilisateur (rendu serveur en UTC sur Vercel).
    const zone = tz(parseTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));

    const allSets = groups.flatMap((group) => group.sets);
    const doneCount = allSets.filter((set) => set.completed).length;
    // Exercices réellement pratiqués (au moins une série), comme le compte de la liste Historique.
    const practiced = groups.filter((group) => group.sets.length > 0);
    // Un exercice qui cible plusieurs muscles compte pour chacun d'eux.
    const muscleCounts = [...new Set(practiced.flatMap((group) => group.exercise.muscle))]
      .map((muscle) => ({
        muscle,
        count: practiced.filter((group) => group.exercise.muscle.includes(muscle)).length,
      }))
      .sort((a, b) => b.count - a.count);

    return (
      <>
        <PageHeader backHref="/history" title={<h1>{session.name}</h1>} />
        <Container className="space-y-4">
          <div className="space-y-3 rounded-2xl bg-accent px-4 py-3.5 text-accent-contrast">
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <div>
                <p className="text-[22px] font-semibold leading-tight tracking-tight">
                  {capitalize(format(session.startedAt, "EEEE", { locale: fr, in: zone }))}
                  <br />
                  {format(session.startedAt, "d MMMM", { locale: fr, in: zone })}
                </p>
                <p className="mt-1.5 font-mono text-xs text-accent-contrast/60">
                  {format(session.startedAt, "HH:mm", { in: zone })} → {format(session.lastActivityAt, "HH:mm", { in: zone })}
                </p>
              </div>
              <dl className="grid gap-1.5 border-l border-accent-contrast/20 pl-4">
                {[
                  { label: "Durée", value: formatDuration(session.lastActivityAt.getTime() - session.startedAt.getTime()) },
                  { label: "Exercices", value: practiced.length },
                  { label: "Séries", value: `${doneCount}/${allSets.length}` },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-baseline justify-between gap-3.5 text-xs">
                    <dt className="text-accent-contrast/60">{stat.label}</dt>
                    <dd className="font-mono text-[13px] font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {muscleCounts.length > 0 && (
              // Chaque "Triceps 2" est insécable ; le "·" est posé dans la marge gauche de chaque
              // élément et la liste est décalée de cette marge dans un conteneur qui coupe ce qui
              // dépasse : le séparateur du premier élément de chaque ligne est masqué, donc aucune
              // ligne ne commence par "·" quand la liste passe sur plusieurs lignes.
              <div className="overflow-hidden border-t border-accent-contrast/20 pt-3">
                <ul className="-ml-[15px] flex flex-wrap gap-y-0.5 text-[12.5px] leading-relaxed">
                  {muscleCounts.map(({ muscle, count }) => (
                    <li
                      key={muscle}
                      className="relative whitespace-nowrap pl-[15px] before:absolute before:left-[5px] before:opacity-45 before:content-['·']"
                    >
                      {muscle}
                      <span className="ml-[3px] font-mono text-[11px] opacity-65">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {session.note && (
            <p className="flex items-start gap-2 rounded-xl bg-neutral-100 px-3 py-2.5 text-sm text-neutral-600">
              <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" />
              {session.note}
            </p>
          )}

          {previousSession && (
            <p className="font-mono text-xs text-neutral-500">
              Comparé à {previousSession.name} du {format(previousSession.startedAt, "d MMM", { locale: fr, in: zone })}
            </p>
          )}

          {practiced.length === 0 && <p className="text-sm text-neutral-500">Aucune série enregistrée.</p>}

          {practiced.map((group) => {
            // Variante(s) faite(s) à la place de l'exercice prévu (machine prise…).
            const substitutes = [...new Set(group.sets.filter((set) => set.substituteForId).map((set) => set.exercise.name))];
            const onlySubstitutes = group.sets.every((set) => set.substituteForId);
            return (
              <Card key={group.exerciseId} className="px-3.5 py-3">
                <div className="flex items-baseline gap-2">
                  <p className="font-medium">{onlySubstitutes ? substitutes.join(", ") : group.exercise.name}</p>
                  <span className="ml-auto font-mono text-[11px] text-neutral-500">
                    {group.sets.filter((set) => set.completed).length}/{group.sets.length}
                  </span>
                </div>
                {substitutes.length > 0 && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                    <ArrowLeftRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {onlySubstitutes ? `à la place de ${group.exercise.name}` : `puis ${substitutes.join(", ")}`}
                  </p>
                )}
                {/* La séance de référence a fait l'exercice prévu : aucune comparaison pour une
                    variante, qui fausserait l'évolution affichée.
                    ponytail: un exercice mélangé (prévu puis variante) compare encore toutes ses
                    séries à l'exercice prévu ; comparer série par série si ça gêne. */}
                <HistorySetList sets={group.sets} previous={onlySubstitutes ? null : previousSetsFor(group.exerciseId)} />
              </Card>
            );
          })}
        </Container>
      </>
    );
  }

  const activeExerciseId =
    typeof requestedExerciseId === "string" && groups.some((g) => g.exerciseId === requestedExerciseId)
      ? requestedExerciseId
      : groups[0].exerciseId;

  const { history, substitutes, library } = await getSessionExerciseData(session.userId, groups, session.id);

  const seed: SessionSeed = {
    sessionId: session.id,
    workoutTemplateId: session.workoutTemplateId ?? "",
    templateName: session.name,
    groups,
    history,
    library,
    substitutes,
    completedAt: null,
    startedAt: session.startedAt.toISOString(),
  };

  return <SessionTracker backHref="/history" seed={seed} activeExerciseId={activeExerciseId} />;
}
