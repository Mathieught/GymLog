import { prisma } from "@/lib/prisma";

// Logique de mutation d'une séance, partagée par la route de synchronisation hors ligne
// (src/app/api/sessions/sync/route.ts). Les ids (séance, série) sont toujours fournis par
// l'appelant (générés côté client, voir src/lib/offline) : chaque opération est donc un
// upsert/delete idempotent, rejouable sans effet de bord si le client retente un lot déjà
// appliqué.

// Rejetée pour une opération qui ne deviendra jamais valide (séance déjà terminée, série
// introuvable) : à distinguer d'une panne transitoire (réseau, base) qui mérite d'être
// retentée. La route de synchronisation abandonne la retentative sur ce type d'erreur — sinon
// une telle opération, jamais applicable, bloquerait indéfiniment toute la file derrière elle.
export class InvalidMutationError extends Error {}

async function assertSessionMutable(userId: string, sessionId: string) {
  const session = await prisma.workoutSession.findUniqueOrThrow({ where: { id: sessionId, userId } });
  if (session.completedAt) {
    throw new InvalidMutationError("Séance déjà terminée : modification impossible");
  }
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

async function touchSessionActivity(sessionId: string) {
  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });
}

export async function addSet(
  userId: string,
  params: { setId: string; sessionId: string; exerciseId: string; exerciseOrder: number; setNumber: number }
) {
  await assertSessionMutable(userId, params.sessionId);

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
  await touchSessionActivity(params.sessionId);
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
  await assertSessionMutable(userId, params.sessionId);

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
  await touchSessionActivity(params.sessionId);
}

export async function updateSet(
  userId: string,
  params: { setId: string; actualWeight: number | null; actualReps: number | null; completed: boolean }
) {
  // findFirst plutôt que updateMany : il faut le workoutSessionId pour rafraîchir lastActivityAt
  // (pas fourni par l'appelant ici, à la différence des autres mutations — voir
  // src/lib/offline/session-engine.ts).
  const set = await prisma.workoutSet.findFirst({
    where: { id: params.setId, workoutSession: { userId, completedAt: null } },
    select: { workoutSessionId: true },
  });
  if (!set) {
    throw new InvalidMutationError("Série introuvable, non autorisée, ou séance déjà terminée");
  }
  await prisma.workoutSet.update({
    where: { id: params.setId },
    data: { actualWeight: params.actualWeight, actualReps: params.actualReps, completed: params.completed },
  });
  await touchSessionActivity(set.workoutSessionId);
}

// Contrairement à updateSet, pas de restriction "séance active" : une note se modifie aussi sur
// une série d'une séance déjà terminée (voir SetRecap, qui ouvre cette même mutation depuis
// l'historique d'une séance en cours).
export async function updateSetNote(userId: string, params: { setId: string; note: string | null }) {
  const set = await prisma.workoutSet.findFirst({
    where: { id: params.setId, workoutSession: { userId } },
    select: { id: true },
  });
  if (!set) {
    throw new InvalidMutationError("Série introuvable ou non autorisée");
  }
  await prisma.workoutSet.update({ where: { id: params.setId }, data: { note: params.note } });
}

export async function removeSet(
  userId: string,
  params: { setId: string; sessionId: string; exerciseId: string }
) {
  await assertSessionMutable(userId, params.sessionId);

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
    await tx.workoutSession.update({
      where: { id: params.sessionId },
      data: { lastActivityAt: new Date() },
    });
  });
}

export async function completeSession(userId: string, sessionId: string) {
  await prisma.workoutSession.updateMany({
    where: { id: sessionId, userId, completedAt: null },
    data: { completedAt: new Date() },
  });
}
