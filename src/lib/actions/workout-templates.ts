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

// Nombre de séries de chaque exercice de la séance : celui déjà figé dans la séance s'il y était
// (modifier l'exercice ensuite ne touche pas les séances existantes), sinon copie de l'objectif
// actuel de l'exercice au moment de l'ajout (aucune série si non renseigné).
async function resolveTargetSets(exerciseIds: string[], templateId?: string) {
  const [existing, exercises] = await Promise.all([
    templateId
      ? prisma.workoutExercise.findMany({
          where: { workoutTemplateId: templateId },
          select: { exerciseId: true, targetSets: true },
        })
      : [],
    prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, targetSets: true },
    }),
  ]);
  const frozen = new Map(existing.map((e) => [e.exerciseId, e.targetSets]));
  const current = new Map(exercises.map((e) => [e.id, e.targetSets ?? 0]));
  return (exerciseId: string) => frozen.get(exerciseId) ?? current.get(exerciseId) ?? 0;
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
  const targetSetsFor = await resolveTargetSets(parsed.data.exercises.map((e) => e.exerciseId));
  await prisma.workoutTemplate.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      exercises: {
        create: parsed.data.exercises.map((exercise, index) => ({
          exerciseId: exercise.exerciseId,
          targetSets: targetSetsFor(exercise.exerciseId),
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

  const targetSetsFor = await resolveTargetSets(
    parsed.data.exercises.map((e) => e.exerciseId),
    templateId
  );
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
            targetSets: targetSetsFor(exercise.exerciseId),
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
