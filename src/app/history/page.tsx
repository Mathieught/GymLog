import type { ComponentProps } from "react";
import { endOfWeek, format, isSameWeek, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { tz } from "@date-fns/tz";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { closeStaleSessions } from "@/lib/queries/session-status";
import { HistorySearchList } from "@/components/sessions/history-search-list";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { isWithinDays } from "@/lib/utils";
import { parseTimeZone, TIME_ZONE_COOKIE } from "@/lib/time-zone";

type ZoneContext = ReturnType<typeof tz>;

// Semaine française (lundi -> dimanche), calée sur "maintenant" plutôt que sur la séance la plus
// récente : une semaine sans aucune séance reste absente du regroupement (pas de ligne vide), mais
// "Cette semaine"/"Semaine dernière" restent justes même si la dernière séance remonte à plus loin.
// Tous les calculs se font dans le fuseau de l'utilisateur (`zone`), pas celui du serveur.
function weekLabel(weekStart: Date, now: Date, zone: ZoneContext): string {
  const options = { weekStartsOn: 1, in: zone } as const;
  if (isSameWeek(weekStart, now, options)) return "Cette semaine";
  if (isSameWeek(weekStart, subWeeks(now, 1, { in: zone }), options)) return "Semaine dernière";
  const weekEnd = endOfWeek(weekStart, options);
  const sameMonth = format(weekStart, "M", { in: zone }) === format(weekEnd, "M", { in: zone });
  const startLabel = format(weekStart, sameMonth ? "d" : "d MMMM", { locale: fr, in: zone });
  const endLabel = format(weekEnd, "d MMMM", { locale: fr, in: zone });
  return `Semaine du ${startLabel} au ${endLabel}`;
}

export default async function HistoryPage() {
  const userId = await getCurrentUserId();
  const zone = tz(parseTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  await closeStaleSessions(userId);
  // Vue consultation uniquement : une séance n'apparaît ici qu'une fois terminée (elle devient
  // alors en lecture seule, voir resolveSessionCompletion) — une séance en cours ne s'y trouve pas.
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      sets: { select: { exerciseId: true } },
    },
  });

  // Un seul passage : les séances arrivent déjà triées du plus récent au plus ancien, donc celles
  // d'une même semaine se suivent forcément — pas besoin de regrouper puis retrier.
  const now = new Date();
  const groups: ComponentProps<typeof HistorySearchList>["groups"] = [];
  for (const session of sessions) {
    const weekStart = startOfWeek(session.startedAt, { weekStartsOn: 1, in: zone });
    const key = weekStart.toISOString();
    const exerciseCount = new Set(session.sets.map((set) => set.exerciseId)).size;
    // Libellés de date calculés ici plutôt que dans HistorySearchList (client) : même raison que
    // la page Séances, un Date.now() différent entre serveur et client ferait diverger l'hydratation.
    const item = {
      id: session.id,
      name: session.name,
      day: format(session.startedAt, "d", { in: zone }),
      weekday: format(session.startedAt, "EEE", { locale: fr, in: zone }).replace(".", ""),
      recent: isWithinDays(session.startedAt, 7),
      exerciseCount,
    };
    const currentGroup = groups.at(-1);
    if (currentGroup?.key === key) {
      currentGroup.sessions.push(item);
    } else {
      groups.push({ key, label: weekLabel(weekStart, now, zone), sessions: [item] });
    }
  }

  return (
    <Container topSafeArea>
      <PageTitle>Historique</PageTitle>

      {sessions.length === 0 ? (
        <p className="text-neutral-500">
          Aucune séance enregistrée pour l&apos;instant. Démarrez-en une depuis l&apos;onglet
          Entraînement.
        </p>
      ) : (
        <HistorySearchList groups={groups} />
      )}
    </Container>
  );
}
