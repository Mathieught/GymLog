import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/constants";

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
  muscle: z.enum(MUSCLE_GROUPS, { message: "Choisissez un muscle" }),
  targetWeight: z.coerce
    .number({ error: "Doit être un nombre" })
    .min(0, "Doit être positif ou nul")
    .max(1000, "Valeur trop élevée"),
  targetReps: z.coerce
    .number({ error: "Doit être un nombre" })
    .int("Doit être un nombre entier")
    .min(1, "Doit être au moins 1")
    .max(200, "Valeur trop élevée"),
  description: z
    .string()
    .trim()
    .max(500, "500 caractères maximum")
    .optional()
    .or(z.literal("")),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
