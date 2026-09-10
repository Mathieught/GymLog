import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  const label = format(date, "EEEE d MMMM", { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
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

  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle>Historique</PageTitle>

        {sessions.length === 0 ? (
          <p className="text-neutral-500">
            Aucune séance enregistrée pour l&apos;instant. Démarrez-en une depuis l&apos;onglet
            Séances.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => {
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
        )}
      </Container>
    </>
  );
}
