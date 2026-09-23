import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Poids toujours affiché avec 2 décimales (30.00, 30.25) : la saisie se fait au quart de kg.
export function formatWeight(weight: number) {
  return weight.toFixed(2);
}
