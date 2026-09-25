import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { LibraryExercise } from "@/lib/offline/types";

// Liste lue sur presque chaque navigation (page Exercices, formulaires de séance) mais qui ne
// change que lors d'une création/modification/archivage : mise en cache (Next Data Cache) pour
// éviter de refaire l'aller-retour base à chaque affichage. Invalidée via revalidateTag depuis
// src/lib/actions/exercises.ts.
export const getActiveExercises = unstable_cache(
  async (userId: string) =>
    prisma.exercise.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: "asc" },
    }),
  ["active-exercises"],
  { tags: ["exercises"] }
);

// Forme compacte utilisée en séance (choix d'une variante), côté serveur comme hors ligne.
export function toLibraryExercise(exercise: {
  id: string;
  name: string;
  muscle: string[];
  targetSets: number | null;
  targetMinutes: number | null;
  description: string | null;
}): LibraryExercise {
  const { id, name, muscle, targetSets, targetMinutes, description } = exercise;
  return { id, name, muscle, targetSets: targetSets ?? 0, targetMinutes, description };
}

// Page détail/édition consultée sur (presque) chaque tape sur un exercice : sans cache, chaque
// visite refaisait l'aller-retour vers la base distante (même symptôme corrigé côté séances, voir
// getWorkoutTemplateDetail). Même tag que ci-dessus, déjà invalidé par create/update/archiveExercise.
export const getExerciseDetail = unstable_cache(
  async (id: string) => prisma.exercise.findUnique({ where: { id } }),
  ["exercise-detail"],
  { tags: ["exercises"] }
);
