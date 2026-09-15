import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/constants";

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
  // Transmis par MuscleGroupPicker comme une liste de valeurs séparées par des virgules (les noms
  // de muscle ne contiennent jamais de virgule) : un champ texte suffit, pas besoin de plusieurs
  // <input> de même nom ni de FormData.getAll côté action.
  muscle: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.enum(MUSCLE_GROUPS)).min(1, "Choisissez au moins un muscle")),
  targetSets: z.coerce
    .number({ error: "Doit être un nombre" })
    .int("Doit être un nombre entier")
    .min(1, "Doit être au moins 1")
    .max(50, "Valeur trop élevée"),
  description: z
    .string()
    .trim()
    .max(500, "500 caractères maximum")
    .optional()
    .or(z.literal("")),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
