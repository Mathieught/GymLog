import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Même logique que getActiveExercises : la liste des séances change rarement, mise en cache et
// invalidée via revalidateTag depuis src/lib/actions/workout-templates.ts.
export const getActiveWorkoutTemplates = unstable_cache(
  async (userId: string) =>
    prisma.workoutTemplate.findMany({
      where: { userId, isArchived: false },
      include: {
        _count: { select: { exercises: true } },
        schedules: true,
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  // v2 : change de clé pour forcer un cache froid après un peuplement de données fait en dehors de
  // l'app (script direct en base, sans passer par revalidateTag) — sans ça la liste restait
  // indéfiniment périmée sur le déploiement de prod tant que rien n'appelait updateTag.
  ["active-workout-templates-v2"],
  { tags: ["workout-templates"] }
);

// Page détail/édition consultée sur (presque) chaque tape sur une séance : sans cache, chaque
// visite refait l'aller-retour vers la base distante (~400-700ms observés). Même tag que
// ci-dessus, déjà invalidé par create/update/archiveWorkoutTemplate.
export const getWorkoutTemplateDetail = unstable_cache(
  async (id: string) =>
    prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
        schedules: true,
      },
    }),
  ["workout-template-detail"],
  { tags: ["workout-templates"] }
);

// Pas de cache : change à chaque séance lancée, et aucune mutation de séance n'invalide le tag
// "workout-templates".
export async function getLastSessionDate(templateId: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { workoutTemplateId: templateId },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  return session?.startedAt ?? null;
}

// Utilisée par /api/offline/snapshot, rappelée à chaque navigation pour alimenter IndexedDB : même
// aller-retour évitable que ci-dessus. Taguée aussi "exercises" (pas seulement "workout-templates")
// puisqu'elle embarque le détail de chaque exercice (nom, muscles, objectif de séries) — un
// renommage d'exercice seul, sans toucher au programme, doit aussi l'invalider.
export const getActiveWorkoutTemplatesWithExerciseDetail = unstable_cache(
  async (userId: string) =>
    prisma.workoutTemplate.findMany({
      where: { userId, isArchived: false },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ["active-workout-templates-with-exercises"],
  { tags: ["workout-templates", "exercises"] }
);
