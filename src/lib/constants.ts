export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Avant-bras",
  "Abdominaux",
  "Jambes",
  "Autres",
] as const;

// Nombre de séries proposées en raccourci dans le sélecteur de séries (au-delà, l'utilisateur
// passe par "Valeur personnalisée").
export const QUICK_SET_COUNTS = [1, 2, 3, 4, 5, 6] as const;

export const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
] as const;

// Une séance se ferme automatiquement 2h après sa dernière modification (lastActivityAt, pas
// startedAt — une longue séance activement suivie ne doit pas se faire couper en plein milieu) si
// elle a été abandonnée en cours de route. Sinon, elle se termine explicitement (popup proposée dès
// que toutes les séries sont validées, ou bouton "Terminer" manuel) et bascule aussitôt en lecture
// seule.
export const SESSION_AUTO_CLOSE_MS = 2 * 60 * 60 * 1000;

export function formatScheduleDays(scheduleDays: number[]): string | null {
  if (scheduleDays.length === 0) return null;
  return WEEKDAYS.filter((day) => scheduleDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}
