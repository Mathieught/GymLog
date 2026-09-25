import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveWorkoutTemplatesWithExerciseDetail } from "@/lib/queries/workout-templates";
import { getActiveExercises, toLibraryExercise } from "@/lib/queries/exercises";

// Instantané léger des programmes actifs de l'utilisateur, pour alimenter IndexedDB (voir
// src/lib/offline/snapshot.ts) : permet de démarrer une séance hors ligne depuis n'importe quel
// programme, même un dont la page d'aperçu n'a jamais été ouverte individuellement.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [templates, exercises] = await Promise.all([
    getActiveWorkoutTemplatesWithExerciseDetail(userId),
    getActiveExercises(userId),
  ]);

  return NextResponse.json({
    // Bibliothèque complète : choisir une variante en séance marche aussi hors ligne.
    library: exercises.map(toLibraryExercise),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      exercises: template.exercises.map((workoutExercise, exerciseOrder) => ({
        exerciseId: workoutExercise.exerciseId,
        exerciseOrder,
        exercise: {
          name: workoutExercise.exercise.name,
          muscle: workoutExercise.exercise.muscle,
          targetSets: workoutExercise.targetSets,
          targetMinutes: workoutExercise.exercise.targetMinutes,
          description: workoutExercise.exercise.description,
        },
      })),
    })),
  });
}
