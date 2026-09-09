import { z } from "zod";

export const setValuesSchema = z.object({
  actualWeight: z.coerce
    .number({ error: "Doit être un nombre" })
    .min(0, "Doit être positif ou nul")
    .max(1000, "Valeur trop élevée"),
  actualReps: z.coerce
    .number({ error: "Doit être un nombre" })
    .int("Doit être un nombre entier")
    .min(0, "Doit être positif ou nul")
    .max(200, "Valeur trop élevée"),
});

export const setLogSchema = setValuesSchema.extend({
  completed: z.preprocess((value) => value === "true", z.boolean()),
});

export type SetLogInput = z.infer<typeof setLogSchema>;
