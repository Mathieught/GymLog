"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { workoutTemplateSchema } from "@/lib/validations/workout-template";
import type { ActionState } from "@/lib/action-state";

function parseTemplateForm(formData: FormData) {
  const scheduleDays = formData.getAll("scheduleDays");
  let exercises: unknown = [];
  try {
    exercises = JSON.parse(String(formData.get("exercisesJson") ?? "[]"));
  } catch {
    exercises = [];
  }

  return workoutTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    exercises,
    scheduleDays,
  });
}

export async function createWorkoutTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getCurrentUserId();
  await prisma.workoutTemplate.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      exercises: {
        create: parsed.data.exercises.map((exercise, index) => ({
          exerciseId: exercise.exerciseId,
          order: index,
        })),
      },
      schedules: {
        create: parsed.data.scheduleDays.map((dayOfWeek) => ({ dayOfWeek })),
      },
    },
  });

  revalidatePath("/workouts");
  updateTag("workout-templates");
  return { nonce: Date.now() };
}

export async function updateWorkoutTemplate(
  templateId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.$transaction([
    prisma.workoutExercise.deleteMany({ where: { workoutTemplateId: templateId } }),
    prisma.workoutSchedule.deleteMany({ where: { workoutTemplateId: templateId } }),
    prisma.workoutTemplate.update({
      where: { id: templateId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        exercises: {
          create: parsed.data.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            order: index,
          })),
        },
        schedules: {
          create: parsed.data.scheduleDays.map((dayOfWeek) => ({ dayOfWeek })),
        },
      },
    }),
  ]);

  revalidatePath("/workouts");
  updateTag("workout-templates");
  revalidatePath(`/workouts/${templateId}`);
  return { nonce: Date.now() };
}

export async function archiveWorkoutTemplate(templateId: string) {
  await prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { isArchived: true },
  });
  revalidatePath("/workouts");
  updateTag("workout-templates");
  redirect("/workouts");
}

// Appelée après chaque glisser-déposer dans le mode réorganisation de la liste des séances (voir
// WorkoutList) : `orderedIds` est l'ordre complet affiché côté client, on le retranscrit tel quel.
// Filtre par userId (contrairement aux autres actions de ce fichier) car la liste d'ids vient du
// client plutôt que d'un id de route déjà validé par la page.
export async function reorderWorkoutTemplates(orderedIds: string[]) {
  const userId = await getCurrentUserId();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.workoutTemplate.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  );
  revalidatePath("/workouts");
  updateTag("workout-templates");
}
