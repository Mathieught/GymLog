import { prisma } from "@/lib/prisma";

// Logique de mutation d'une séance, partagée par la route de synchronisation hors ligne
// (src/app/api/sessions/sync/route.ts). Les ids (séance, série) sont toujours fournis par
// l'appelant (générés côté client, voir src/lib/offline) : chaque opération est donc un
// upsert/delete idempotent, rejouable sans effet de bord si le client retente un lot déjà
// appliqué.

async function assertSessionOwnership(userId: string, sessionId: string) {
  await prisma.workoutSession.findUniqueOrThrow({ where: { id: sessionId, userId } });
}

export async function ensureSession(
  userId: string,
  params: { sessionId: string; workoutTemplateId: string; name: string }
) {
  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: params.workoutTemplateId, userId },
  });

  await prisma.workoutSession.upsert({
    where: { id: params.sessionId },
    create: { id: params.sessionId, userId, workoutTemplateId: template.id, name: params.name },
    update: {},
  });
}

export async function addSet(
  userId: string,
  params: { setId: string; sessionId: string; exerciseId: string; exerciseOrder: number; setNumber: number }
) {
  await assertSessionOwnership(userId, params.sessionId);

  await prisma.workoutSet.upsert({
    where: { id: params.setId },
    create: {
      id: params.setId,
      workoutSessionId: params.sessionId,
      exerciseId: params.exerciseId,
      exerciseOrder: params.exerciseOrder,
      setNumber: params.setNumber,
    },
    update: {},
  });
}

export async function logSet(
  userId: string,
  params: {
    setId: string;
    sessionId: string;
    exerciseId: string;
    exerciseOrder: number;
    setNumber: number;
    actualWeight: number | null;
    actualReps: number | null;
  }
) {
  await assertSessionOwnership(userId, params.sessionId);

  await prisma.workoutSet.upsert({
    where: { id: params.setId },
    create: {
      id: params.setId,
      workoutSessionId: params.sessionId,
      exerciseId: params.exerciseId,
      exerciseOrder: params.exerciseOrder,
      setNumber: params.setNumber,
      actualWeight: params.actualWeight,
      actualReps: params.actualReps,
      completed: true,
    },
    update: { actualWeight: params.actualWeight, actualReps: params.actualReps, completed: true },
  });
}

export async function updateSet(
  userId: string,
  params: { setId: string; actualWeight: number | null; actualReps: number | null; completed: boolean }
) {
  const result = await prisma.workoutSet.updateMany({
    where: { id: params.setId, workoutSession: { userId } },
    data: { actualWeight: params.actualWeight, actualReps: params.actualReps, completed: params.completed },
  });
  if (result.count === 0) throw new Error("Set introuvable ou non autorisée");
}

export async function removeSet(
  userId: string,
  params: { setId: string; sessionId: string; exerciseId: string }
) {
  await assertSessionOwnership(userId, params.sessionId);

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.deleteMany({ where: { id: params.setId } });
    const remaining = await tx.workoutSet.findMany({
      where: { workoutSessionId: params.sessionId, exerciseId: params.exerciseId },
      orderBy: { setNumber: "asc" },
    });
    await Promise.all(
      remaining.map((remainingSet, index) =>
        tx.workoutSet.update({ where: { id: remainingSet.id }, data: { setNumber: index + 1 } })
      )
    );
  });
}

export async function completeSession(userId: string, sessionId: string) {
  await prisma.workoutSession.updateMany({
    where: { id: sessionId, userId, completedAt: null },
    data: { completedAt: new Date() },
  });
}
