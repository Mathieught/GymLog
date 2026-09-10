"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { setLogSchema, setValuesSchema } from "@/lib/validations/session";
import type { ActionState } from "@/lib/action-state";

// Une séance n'est créée en base qu'au premier enregistrement d'une série (voir addSet
// ci-dessous) : tant qu'aucune donnée n'a été renseignée, la page ne montre qu'un aperçu du
// modèle, sans aucune série pré-remplie (ni nombre de séries, ni poids/reps prévus à l'avance).
async function createSessionFromTemplate(templateId: string) {
  const userId = await getCurrentUserId();
  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: templateId },
  });

  return prisma.workoutSession.create({
    data: {
      userId,
      workoutTemplateId: template.id,
      name: template.name,
    },
  });
}

export async function updateSet(
  setId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = setLogSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const set = await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      actualWeight: parsed.data.actualWeight,
      actualReps: parsed.data.actualReps,
      completed: parsed.data.completed,
    },
    select: { workoutSessionId: true },
  });

  revalidatePath(`/sessions/${set.workoutSessionId}`);
  return {};
}

export async function addSet(sessionOrTemplateArg: string, exerciseId: string, exerciseOrder: number) {
  // Identifiant "virtuel" (page d'aperçu d'un modèle) : ajouter la première série démarre la séance.
  let sessionId = sessionOrTemplateArg;
  let isNewSession = false;
  if (sessionOrTemplateArg.startsWith("v:")) {
    const session = await createSessionFromTemplate(sessionOrTemplateArg.slice(2));
    sessionId = session.id;
    isNewSession = true;
  }

  const lastSet = await prisma.workoutSet.findFirst({
    where: { workoutSessionId: sessionId, exerciseId },
    orderBy: { setNumber: "desc" },
  });

  await prisma.workoutSet.create({
    data: {
      workoutSessionId: sessionId,
      exerciseId,
      exerciseOrder,
      setNumber: (lastSet?.setNumber ?? 0) + 1,
    },
  });

  if (isNewSession) {
    redirect(`/sessions/${sessionId}?exercise=${exerciseId}`);
  }
  revalidatePath(`/sessions/${sessionId}`);
}

// Valide (avec ou sans modification) une série suggérée à partir de la dernière performance :
// crée directement la série réelle, déjà marquée comme terminée.
export async function logSet(
  sessionOrTemplateArg: string,
  exerciseId: string,
  exerciseOrder: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = setValuesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let sessionId = sessionOrTemplateArg;
  let isNewSession = false;
  if (sessionOrTemplateArg.startsWith("v:")) {
    const session = await createSessionFromTemplate(sessionOrTemplateArg.slice(2));
    sessionId = session.id;
    isNewSession = true;
  }

  const lastSet = await prisma.workoutSet.findFirst({
    where: { workoutSessionId: sessionId, exerciseId },
    orderBy: { setNumber: "desc" },
  });

  await prisma.workoutSet.create({
    data: {
      workoutSessionId: sessionId,
      exerciseId,
      exerciseOrder,
      setNumber: (lastSet?.setNumber ?? 0) + 1,
      actualWeight: parsed.data.actualWeight,
      actualReps: parsed.data.actualReps,
      completed: true,
    },
  });

  if (isNewSession) {
    redirect(`/sessions/${sessionId}?exercise=${exerciseId}`);
  }
  revalidatePath(`/sessions/${sessionId}`);
  return {};
}

export async function removeSet(setId: string) {
  const set = await prisma.workoutSet.findUniqueOrThrow({ where: { id: setId } });

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.delete({ where: { id: setId } });
    const remaining = await tx.workoutSet.findMany({
      where: { workoutSessionId: set.workoutSessionId, exerciseId: set.exerciseId },
      orderBy: { setNumber: "asc" },
    });
    await Promise.all(
      remaining.map((remainingSet, index) =>
        tx.workoutSet.update({ where: { id: remainingSet.id }, data: { setNumber: index + 1 } })
      )
    );
  });

  revalidatePath(`/sessions/${set.workoutSessionId}`);
}

export async function completeSession(sessionId: string) {
  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
  });
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/history");
  redirect("/history");
}
