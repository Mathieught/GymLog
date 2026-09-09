"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { exerciseSchema } from "@/lib/validations/exercise";
import type { ActionState } from "@/lib/action-state";

export async function createExercise(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getCurrentUserId();
  await prisma.exercise.create({
    data: {
      userId,
      name: parsed.data.name,
      muscle: parsed.data.muscle,
      targetWeight: parsed.data.targetWeight,
      targetReps: parsed.data.targetReps,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function updateExercise(
  exerciseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      name: parsed.data.name,
      muscle: parsed.data.muscle,
      targetWeight: parsed.data.targetWeight,
      targetReps: parsed.data.targetReps,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
  redirect(`/exercises/${exerciseId}`);
}

export type CreateExerciseInlineState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  exercise?: {
    id: string;
    name: string;
    muscle: string;
    targetWeight: number;
    targetReps: number;
  };
  nonce?: number;
};

// Variante de createExercise sans redirection, pour créer un exercice sans quitter
// le formulaire appelant (ex : ajout à la volée depuis le formulaire de séance).
export async function createExerciseInline(
  _prevState: CreateExerciseInlineState,
  formData: FormData
): Promise<CreateExerciseInlineState> {
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getCurrentUserId();
  const exercise = await prisma.exercise.create({
    data: {
      userId,
      name: parsed.data.name,
      muscle: parsed.data.muscle,
      targetWeight: parsed.data.targetWeight,
      targetReps: parsed.data.targetReps,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  return {
    exercise: {
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      targetWeight: exercise.targetWeight,
      targetReps: exercise.targetReps,
    },
    nonce: Date.now(),
  };
}

export async function archiveExercise(exerciseId: string) {
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: { isArchived: true },
  });
  revalidatePath("/exercises");
  redirect("/exercises");
}
