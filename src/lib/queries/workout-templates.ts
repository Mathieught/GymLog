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
      orderBy: { name: "asc" },
    }),
  ["active-workout-templates"],
  { tags: ["workout-templates"] }
);
