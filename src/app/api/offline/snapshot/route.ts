import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Instantané léger des programmes actifs de l'utilisateur, pour alimenter IndexedDB (voir
// src/lib/offline/snapshot.ts) : permet de démarrer une séance hors ligne depuis n'importe quel
// programme, même un dont la page d'aperçu n'a jamais été ouverte individuellement.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const templates = await prisma.workoutTemplate.findMany({
    where: { userId, isArchived: false },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      exercises: template.exercises.map((workoutExercise, exerciseOrder) => ({
        exerciseId: workoutExercise.exerciseId,
        exerciseOrder,
        exercise: { name: workoutExercise.exercise.name, muscle: workoutExercise.exercise.muscle },
      })),
    })),
  });
}
