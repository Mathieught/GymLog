import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { exerciseSchema } from "@/lib/validations/exercise";

// Valide le lot d'opérations envoyé par le moteur hors ligne (src/lib/offline/session-engine.ts)
// avant de les rejouer : ce n'est plus une Server Action appelée depuis une page de confiance,
// mais un endpoint JSON, donc les mêmes bornes que la saisie manuelle (voir
// src/lib/validations/session.ts) s'appliquent ici aussi.
const id = z.string().min(1);
const actualWeight = z.number().min(0).max(1000);
const actualReps = z.number().min(0).max(200);
// Absent des opérations mises en file avant l'arrivée des variantes.
const substituteForId = id.nullable().optional();

const outboxOpSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ensureSession"),
    sessionId: id,
    workoutTemplateId: id,
    name: z.string().min(1).max(200),
    startedAt: z.iso.datetime().optional(),
  }),
  z.object({
    type: z.literal("addSet"),
    setId: id,
    sessionId: id,
    exerciseId: id,
    exerciseOrder: z.number().int().min(0),
    setNumber: z.number().int().min(1),
    substituteForId,
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
    substituteForId,
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
  z.object({ type: z.literal("updateExerciseNote"), exerciseId: id, note: z.string().max(500).nullable() }),
  z.object({
    type: z.literal("createExercise"),
    exerciseId: id,
    // Mêmes bornes que le formulaire d'exercice (voir exerciseSchema).
    name: exerciseSchema.shape.name,
    muscle: z.array(z.enum(MUSCLE_GROUPS)).min(1),
    targetSets: z.number().int().min(1).max(50).nullable(),
  }),
  z.object({ type: z.literal("switchExercise"), sessionId: id, slotExerciseId: id, exerciseId: id }),
  z.object({ type: z.literal("completeSession"), sessionId: id }),
  z.object({ type: z.literal("discardSession"), sessionId: id }),
]);

export const syncRequestSchema = z.object({
  ops: z.array(z.object({ seq: z.number().int(), op: outboxOpSchema })),
});
