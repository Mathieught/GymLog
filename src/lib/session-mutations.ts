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
  params: { sessionId: string; workoutTemplateId: string; name: string; startedAt?: string }
) {
  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: params.workoutTemplateId, userId },
  });

  await prisma.workoutSession.upsert({
    where: { id: params.sessionId },
    create: {
      id: params.sessionId,
      userId,
      workoutTemplateId: template.id,
      name: params.name,
      startedAt: params.startedAt ? new Date(params.startedAt) : undefined,
    },
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
  params: {
    setId: string;
    sessionId: string;
    exerciseId: string;
    exerciseOrder: number;
    setNumber: number;
    substituteForId?: string | null;
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
      substituteForId: params.substituteForId ?? null,
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
    substituteForId?: string | null;
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
      substituteForId: params.substituteForId ?? null,
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
    select: { workoutSessionId: true, workoutSession: { select: { completedAt: true } } },
  });
  if (!set) {
    throw new InvalidMutationError("Série introuvable ou non autorisée");
  }
  await prisma.workoutSet.update({ where: { id: params.setId }, data: { note: params.note } });
  // Annoter une série d'une séance en cours compte comme une modification (fermeture auto).
  if (!set.workoutSession.completedAt) await touchSessionActivity(set.workoutSessionId);
}

// Partagée avec l'action de la fiche exercice (voir updateExerciseNote dans actions/exercises.ts).
export async function updateExerciseNote(userId: string, params: { exerciseId: string; note: string | null }) {
  const { count } = await prisma.exercise.updateMany({
    where: { id: params.exerciseId, userId },
    data: { description: params.note?.trim() || null },
  });
  if (count === 0) {
    throw new InvalidMutationError("Exercice introuvable ou non autorisé");
  }
}

export async function removeSet(
  userId: string,
  params: { setId: string; sessionId: string; exerciseId: string }
) {
  await assertSessionMutable(userId, params.sessionId);

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.deleteMany({ where: { id: params.setId } });
    // params.exerciseId = l'exercice du programme : ses séries, variantes comprises, partagent une
    // même numérotation.
    const remaining = await tx.workoutSet.findMany({
      where: { workoutSessionId: params.sessionId, ...slotWhere(params.exerciseId) },
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

// Séries rangées à la place d'un exercice du programme : les siennes et celles de ses variantes.
function slotWhere(slotExerciseId: string) {
  return { OR: [{ exerciseId: slotExerciseId, substituteForId: null }, { substituteForId: slotExerciseId }] };
}

// Variante choisie (ou abandonnée) en séance : seules les séries pas encore validées changent
// d'exercice, celles déjà faites restent sur la machine où elles ont été faites.
export async function switchExercise(
  userId: string,
  params: { sessionId: string; slotExerciseId: string; exerciseId: string }
) {
  await assertSessionMutable(userId, params.sessionId);
  const isVariant = params.exerciseId !== params.slotExerciseId;
  await prisma.workoutSet.updateMany({
    where: { workoutSessionId: params.sessionId, completed: false, ...slotWhere(params.slotExerciseId) },
    data: { exerciseId: params.exerciseId, substituteForId: isVariant ? params.slotExerciseId : null },
  });
}

// Upsert : rejouer l'opération (synchro retentée) ne crée jamais de doublon.
export async function createExercise(
  userId: string,
  params: { exerciseId: string; name: string; muscle: string[]; targetSets: number | null }
) {
  await prisma.exercise.upsert({
    where: { id: params.exerciseId },
    create: { id: params.exerciseId, userId, name: params.name, muscle: params.muscle, targetSets: params.targetSets },
    update: {},
  });
}

// Séance quittée sans aucune série validée : supprimée comme si elle n'avait jamais existé (ses
// séries vides partent avec, onDelete: Cascade). Garde-fous côté base : jamais une séance terminée
// ni une séance qui a au moins une série validée, même si le client se trompe.
export async function discardSession(userId: string, sessionId: string) {
  await prisma.workoutSession.deleteMany({
    where: { id: sessionId, userId, completedAt: null, sets: { none: { completed: true } } },
  });
}

export async function completeSession(userId: string, sessionId: string) {
  await prisma.workoutSession.updateMany({
    where: { id: sessionId, userId, completedAt: null },
    data: { completedAt: new Date() },
  });
}
