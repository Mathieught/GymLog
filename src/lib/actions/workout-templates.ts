"use server";

import { revalidatePath } from "next/cache";
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
  redirect("/workouts");
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
  revalidatePath(`/workouts/${templateId}`);
  redirect(`/workouts/${templateId}`);
}

export async function archiveWorkoutTemplate(templateId: string) {
  await prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { isArchived: true },
  });
  revalidatePath("/workouts");
  redirect("/workouts");
}
