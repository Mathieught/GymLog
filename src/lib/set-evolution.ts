import { formatReps, formatWeight } from "@/lib/utils";

export type EvolutionBadge = {
  tone: "up" | "down" | "neutral";
  label: string;
};

type SetValues = { reps: number; weight: number };

// Évolution d'une série faite par rapport à la même série (même numéro) de la séance précédente.
// Poids : vert s'il monte, rouge s'il baisse. Reps : vert si elles montent, rouge si elles
// baissent — sauf quand le poids a monté, où une baisse de reps est normale (affichée en neutre).
// Sans série de référence : "Nouvelle". Rien n'a bougé : "=". Cardio (voir isCardio) : `reps` porte
// la durée, le badge parle en minutes.
export function setEvolution(current: SetValues, previous: SetValues | undefined, cardio = false): EvolutionBadge[] {
  if (!previous) return [{ tone: "neutral", label: "Nouvelle" }];
  const weightDiff = current.weight - previous.weight;
  const repsDiff = current.reps - previous.reps;
  if (weightDiff === 0 && repsDiff === 0) return [{ tone: "neutral", label: "=" }];

  const badges: EvolutionBadge[] = [];
  if (weightDiff !== 0) {
    badges.push({
      tone: weightDiff > 0 ? "up" : "down",
      label: `${weightDiff > 0 ? "+" : "−"}${formatWeight(Math.abs(weightDiff))} kg`,
    });
  }
  if (repsDiff !== 0) {
    const reps = Math.abs(repsDiff);
    badges.push({
      tone: repsDiff > 0 ? "up" : weightDiff > 0 ? "neutral" : "down",
      label: `${repsDiff > 0 ? "+" : "−"}${formatReps(reps)}${cardio ? " min" : ` rep${reps > 1 ? "s" : ""}`}`,
    });
  }
  return badges;
}
