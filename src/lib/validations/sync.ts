import { z } from "zod";

// Valide le lot d'opérations envoyé par le moteur hors ligne (src/lib/offline/session-engine.ts)
// avant de les rejouer : ce n'est plus une Server Action appelée depuis une page de confiance,
// mais un endpoint JSON, donc les mêmes bornes que la saisie manuelle (voir
// src/lib/validations/session.ts) s'appliquent ici aussi.
const id = z.string().min(1);
const actualWeight = z.number().min(0).max(1000);
const actualReps = z.number().int().min(0).max(200);

const outboxOpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ensureSession"), sessionId: id, workoutTemplateId: id, name: z.string().min(1).max(200) }),
  z.object({
    type: z.literal("addSet"),
    setId: id,
    sessionId: id,
    exerciseId: id,
    exerciseOrder: z.number().int().min(0),
    setNumber: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("logSet"),
    setId: id,
    sessionId: id,
    exerciseId: id,
    exerciseOrder: z.number().int().min(0),
    setNumber: z.number().int().min(1),
    actualWeight,
    actualReps,
  }),
  z.object({
    type: z.literal("updateSet"),
    setId: id,
    // Nullable : resetSet (annuler le résultat d'une série) renvoie explicitement à vide plutôt
    // que de renvoyer une valeur bidon.
    actualWeight: actualWeight.nullable(),
    actualReps: actualReps.nullable(),
    completed: z.boolean(),
  }),
  z.object({ type: z.literal("removeSet"), setId: id, sessionId: id, exerciseId: id }),
  z.object({ type: z.literal("updateSetNote"), setId: id, note: z.string().max(500).nullable() }),
  z.object({ type: z.literal("completeSession"), sessionId: id }),
]);

export const syncRequestSchema = z.object({
  ops: z.array(z.object({ seq: z.number().int(), op: outboxOpSchema })),
});
