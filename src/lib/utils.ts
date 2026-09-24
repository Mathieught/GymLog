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

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDaysAgo(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / DAY_MS);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
}

export function isWithinDays(date: Date, days: number) {
  return Date.now() - date.getTime() < days * DAY_MS;
}

// Nombre de séries d'un exercice, facultatif (null = aucune série proposée d'office).
export function formatSetCount(sets: number | null) {
  return sets === null ? "Séries libres" : `${sets} série${sets > 1 ? "s" : ""}`;
}
