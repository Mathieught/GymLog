import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { formatScheduleDays } from "@/lib/constants";

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId, isArchived: false },
    include: {
      _count: { select: { exercises: true } },
      schedules: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle
          action={
            <ButtonLink href="/workouts/new" size="sm">
              + Nouvelle séance
            </ButtonLink>
          }
        >
          Séances
        </PageTitle>

        {templates.length === 0 ? (
          <p className="text-neutral-500">
            Aucune séance pour l&apos;instant. Créez votre premier modèle de séance pour commencer.
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((template) => {
              const scheduleLabel = formatScheduleDays(template.schedules.map((s) => s.dayOfWeek));
              return (
                <li key={template.id}>
                  <Link href={`/workouts/${template.id}`}>
                    <Card className="transition-colors hover:border-neutral-400">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-neutral-500">
                        {template._count.exercises} exercice
                        {template._count.exercises > 1 ? "s" : ""}
                        {scheduleLabel ? ` · ${scheduleLabel}` : ""}
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
