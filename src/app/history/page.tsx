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
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
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
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{session.name}</p>
                        {session.completedAt ? (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                            Terminée
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            En cours
                          </span>
                        )}
                      </div>
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
