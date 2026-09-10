export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Jambes",
  "Fessiers",
  "Mollets",
  "Abdominaux",
  "Avant-bras",
  "Full body",
] as const;

export const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
] as const;

// Une séance se ferme automatiquement 12h après son démarrage si elle a été abandonnée en cours
// de route. Sinon, elle se termine explicitement (popup proposée dès que toutes les séries sont
// validées, ou bouton "Terminer" manuel) et bascule aussitôt en lecture seule.
export const SESSION_AUTO_CLOSE_MS = 12 * 60 * 60 * 1000;

export function formatScheduleDays(scheduleDays: number[]): string | null {
  if (scheduleDays.length === 0) return null;
  return WEEKDAYS.filter((day) => scheduleDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}
