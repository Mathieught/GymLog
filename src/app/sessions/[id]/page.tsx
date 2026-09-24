import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn, formatReps, formatWeight } from "@/lib/utils";
import { setEvolution } from "@/lib/set-evolution";
import { getExerciseHistoryForExercises } from "@/lib/queries/exercise-history";
import { resolveSessionCompletion } from "@/lib/queries/session-status";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import type { SessionRowGroup } from "@/lib/session-rows";

type SetForGrouping = {
  id: string;
  exerciseId: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Rendu côté serveur (UTC sur Vercel) : l'heure est donc forcée sur le fuseau de Paris.
// ponytail: fuseau fixe, à passer sur celui de l'utilisateur si l'app sort de France.
const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const formatTime = (date: Date) => timeFormat.format(date);

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
  const groups: SessionRowGroup[] = (session.workoutTemplate?.exercises ?? []).map(
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
    const previousSets = new Map(
      (previousSession?.sets ?? []).map((set) => [
        `${set.exerciseId}:${set.setNumber}`,
        { reps: set.actualReps!, weight: set.actualWeight! },
      ])
    );

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
                  {capitalize(format(session.startedAt, "EEEE", { locale: fr }))}
                  <br />
                  {format(session.startedAt, "d MMMM", { locale: fr })}
                </p>
                <p className="mt-1.5 font-mono text-xs text-accent-contrast/60">
                  {formatTime(session.startedAt)} → {formatTime(session.lastActivityAt)}
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
              Comparé à {previousSession.name} du {format(previousSession.startedAt, "d MMM", { locale: fr })}
            </p>
          )}

          {practiced.length === 0 && <p className="text-sm text-neutral-500">Aucune série enregistrée.</p>}

          {practiced.map((group) => (
            <Card key={group.exerciseId} className="px-3.5 py-3">
              <div className="flex items-baseline gap-2">
                <p className="font-medium">{group.exercise.name}</p>
                <span className="ml-auto font-mono text-[11px] text-neutral-500">
                  {group.sets.filter((set) => set.completed).length}/{group.sets.length}
                </span>
              </div>
              <ul className="mt-1.5">
                {group.sets.map((set) => {
                  const hasValues = set.actualReps != null && set.actualWeight != null;
                  return (
                    <li
                      key={set.id}
                      className={cn(
                        "grid grid-cols-[22px_1fr_auto] items-center gap-2.5 border-t border-neutral-200 px-2 py-1.5 font-mono tabular-nums",
                        !set.completed && "text-neutral-400"
                      )}
                    >
                      <span className="text-xs text-neutral-500">{set.setNumber}</span>
                      <span>
                        {set.actualReps != null ? formatReps(set.actualReps) : "—"}
                        <span className="mx-0.5 text-neutral-500"> × </span>
                        {set.actualWeight != null ? formatWeight(set.actualWeight) : "—"}
                        <span className="ml-0.5 text-xs text-neutral-500">kg</span>
                      </span>
                      {!set.completed ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          {hasValues ? "Non faite" : "Non saisie"}
                        </span>
                      ) : (
                        previousSession &&
                        hasValues && (
                          <span className="flex gap-1">
                            {setEvolution(
                              { reps: set.actualReps!, weight: set.actualWeight! },
                              previousSets.get(`${group.exerciseId}:${set.setNumber}`)
                            ).map((badge) => (
                              <span
                                key={badge.label}
                                className={cn(
                                  "whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                                  badge.tone === "up" && "bg-accent-soft text-accent",
                                  badge.tone === "down" && "bg-danger/15 text-danger",
                                  badge.tone === "neutral" && "bg-neutral-100 text-neutral-500"
                                )}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </span>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
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

  const seed: SessionSeed = {
    sessionId: session.id,
    workoutTemplateId: session.workoutTemplateId ?? "",
    templateName: session.name,
    groups,
    history,
    completedAt: null,
    startedAt: session.startedAt.toISOString(),
  };

  return <SessionTracker backHref="/history" seed={seed} activeExerciseId={activeExerciseId} />;
}
