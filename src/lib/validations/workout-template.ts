import { z } from "zod";

export const workoutTemplateExerciseSchema = z.object({
  exerciseId: z.string().min(1),
});

export const workoutTemplateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
  description: z
    .string()
    .trim()
    .max(500, "500 caractères maximum")
    .optional()
    .or(z.literal("")),
  exercises: z.array(workoutTemplateExerciseSchema),
  scheduleDays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
});

export type WorkoutTemplateInput = z.infer<typeof workoutTemplateSchema>;
export type WorkoutTemplateExerciseInput = z.infer<typeof workoutTemplateExerciseSchema>;
