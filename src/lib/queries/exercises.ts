import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

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
