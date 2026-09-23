import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Poids toujours affiché avec 2 décimales (30.00, 30.25) : la saisie se fait au quart de kg.
export function formatWeight(weight: number) {
  return weight.toFixed(2);
}

// Reps entières affichées telles quelles (10) ; décimales seulement pour une répétition partielle
// saisie en mode Avancé (10.50).
export function formatReps(reps: number) {
  return Number.isInteger(reps) ? String(reps) : reps.toFixed(2);
}
