import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Même logique que getActiveExercises : la liste des séances change rarement, mise en cache et
// invalidée via revalidateTag depuis src/lib/actions/workout-templates.ts.
export const getActiveWorkoutTemplates = unstable_cache(
  async (userId: string) =>
    prisma.workoutTemplate.findMany({
      where: { userId, isArchived: false },
      include: {
        exercises: { select: { exercise: { select: { muscle: true } } }, orderBy: { order: "asc" } },
        schedules: true,
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  // v2 : change de clé pour forcer un cache froid après un peuplement de données fait en dehors de
  // l'app (script direct en base, sans passer par revalidateTag) — sans ça la liste restait
  // indéfiniment périmée sur le déploiement de prod tant que rien n'appelait updateTag.
  // v3 : embarque les muscles des exercices, d'où aussi le tag "exercises".
  ["active-workout-templates-v3"],
  { tags: ["workout-templates", "exercises"] }
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

// Date de la dernière séance de chaque programme, pour la liste. Pas de cache : change à chaque
// séance lancée, et aucune mutation de séance n'invalide le tag "workout-templates".
export async function getLastSessionDates(userId: string) {
  const rows = await prisma.workoutSession.groupBy({
    by: ["workoutTemplateId"],
    where: { userId, workoutTemplateId: { not: null } },
    _max: { startedAt: true },
  });
  return new Map(rows.map((row) => [row.workoutTemplateId, row._max.startedAt]));
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
