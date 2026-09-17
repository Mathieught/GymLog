import Link from "next/link";
import { endOfWeek, format, isSameWeek, isToday, isYesterday, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  const label = format(date, "EEEE d MMMM", { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Semaine française (lundi -> dimanche), calée sur "maintenant" plutôt que sur la séance la plus
// récente : une semaine sans aucune séance reste absente du regroupement (pas de ligne vide), mais
// "Cette semaine"/"Semaine dernière" restent justes même si la dernière séance remonte à plus loin.
function weekLabel(weekStart: Date, now: Date): string {
  if (isSameWeek(weekStart, now, { weekStartsOn: 1 })) return "Cette semaine";
  if (isSameWeek(weekStart, subWeeks(now, 1), { weekStartsOn: 1 })) return "Semaine dernière";
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = format(weekStart, sameMonth ? "d" : "d MMMM", { locale: fr });
  const endLabel = format(weekEnd, "d MMMM", { locale: fr });
  return `Semaine du ${startLabel} au ${endLabel}`;
}

export default async function HistoryPage() {
  const userId = await getCurrentUserId();
  // Vue consultation uniquement : une séance n'apparaît ici qu'une fois terminée (elle devient
  // alors en lecture seule, voir resolveSessionCompletion) — une séance en cours ne s'y trouve pas.
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      sets: { select: { exerciseId: true, completed: true } },
    },
  });

  // Un seul passage : les séances arrivent déjà triées du plus récent au plus ancien, donc celles
  // d'une même semaine se suivent forcément — pas besoin de regrouper puis retrier.
  const now = new Date();
  const groups: { key: string; label: string; sessions: typeof sessions }[] = [];
  for (const session of sessions) {
    const weekStart = startOfWeek(session.startedAt, { weekStartsOn: 1 });
    const key = weekStart.toISOString();
    const currentGroup = groups.at(-1);
    if (currentGroup?.key === key) {
      currentGroup.sessions.push(session);
    } else {
      groups.push({ key, label: weekLabel(weekStart, now), sessions: [session] });
    }
  }

  return (
    <Container topSafeArea>
      <PageTitle>Historique</PageTitle>

      {sessions.length === 0 ? (
        <p className="text-neutral-500">
          Aucune séance enregistrée pour l&apos;instant. Démarrez-en une depuis l&apos;onglet
          Séances.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-2 text-sm font-medium text-neutral-500">{group.label}</h2>
              <ul className="space-y-2">
                {group.sessions.map((session) => {
                  const exerciseCount = new Set(session.sets.map((set) => set.exerciseId)).size;
                  const completedSets = session.sets.filter((set) => set.completed).length;

                  return (
                    <li key={session.id}>
                      <Link href={`/sessions/${session.id}`}>
                        <Card className="transition-colors hover:border-neutral-400">
                          <p className="font-medium">{session.name}</p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {formatSessionDate(session.startedAt)} · {exerciseCount} exercice
                            {exerciseCount > 1 ? "s" : ""} · {completedSets} série
                            {completedSets > 1 ? "s" : ""}
                          </p>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
