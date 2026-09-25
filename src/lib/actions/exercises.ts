"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { exerciseSchema, inlineExerciseSchema } from "@/lib/validations/exercise";
import type { ActionState } from "@/lib/action-state";
import * as mutations from "@/lib/session-mutations";

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
      targetSets: parsed.data.targetSets,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  updateTag("exercises");
  return { nonce: Date.now() };
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
      targetSets: parsed.data.targetSets,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  updateTag("exercises");
  revalidatePath(`/exercises/${exerciseId}`);
  return { nonce: Date.now() };
}

// Édition de la seule note depuis la fiche exercice (voir ExerciseNote), sans rouvrir tout le
// formulaire.
export async function updateExerciseNote(exerciseId: string, note: string | null) {
  const parsed = exerciseSchema.shape.description.safeParse(note ?? "");
  if (!parsed.success) return;

  await mutations.updateExerciseNote(await getCurrentUserId(), { exerciseId, note: parsed.data || null });

  updateTag("exercises");
  revalidatePath(`/exercises/${exerciseId}`);
}

export type CreateExerciseInlineState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  exercise?: {
    id: string;
    name: string;
    muscle: string[];
    targetSets: number | null;
  };
  nonce?: number;
};

// Variante de createExercise sans redirection, pour créer un exercice sans quitter
// le formulaire appelant (ex : ajout à la volée depuis le formulaire de séance).
export async function createExerciseInline(
  _prevState: CreateExerciseInlineState,
  formData: FormData
): Promise<CreateExerciseInlineState> {
  const parsed = inlineExerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getCurrentUserId();
  const exercise = await prisma.exercise.create({
    data: {
      userId,
      name: parsed.data.name,
      muscle: parsed.data.muscle,
      targetSets: parsed.data.targetSets,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/exercises");
  updateTag("exercises");
  return {
    exercise: {
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      targetSets: exercise.targetSets,
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
  updateTag("exercises");
  redirect("/exercises");
}
