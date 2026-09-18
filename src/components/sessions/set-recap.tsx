import { cn } from "@/lib/utils";
import type { SessionRowRecapEntry } from "@/lib/session-rows";

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

// Récap de LA MÊME série sur les séances passées (jusqu'à 3), rendu à l'intérieur de la carte de
// la série — jamais un bloc séparé — pour que la comparaison se fasse par position, sans recoller
// mentalement plusieurs séances. Chaque pastille est datée : une séance sans cette série (objectif
// de séries augmenté depuis) garde sa date mais affiche un tiret plutôt qu'un 0×0 trompeur.
export function SetRecap({ entries }: { entries: SessionRowRecapEntry[] }) {
  if (entries.length === 0) return null;

  // neutral-900/10 (pas white/10 : --color-white est le fond sombre de l'app, pas du blanc) pour un
  // filet clair discret, lisible aussi bien sur les fonds neutres des différents états.
  return (
    <div className="flex gap-1.5 border-t border-neutral-900/10 px-3 pb-2.5 pt-2">
      {entries.map((entry) => {
        // Un set peut exister sans valeur (créé puis jamais renseigné, actualReps/actualWeight
        // null) : traité comme absent ici, sinon on afficherait littéralement "null×null".
        const hasValue = entry.set?.actualReps != null && entry.set?.actualWeight != null;
        return (
          <div
            key={entry.sessionDate.toISOString()}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md px-1.5 py-1",
              // Superposition noire translucide (pas bg-neutral-100, une teinte fixe) : la pastille
              // s'assombrit relativement au fond qui la porte plutôt que de plaquer une couleur figée
              // par-dessus — elle se fond aussi bien dans une carte neutre (série pas encore validée)
              // que dans le fond vert accent-soft d'une série validée, au lieu d'y ressortir comme un
              // pavé gris étranger.
              hasValue ? "bg-black/20" : "border border-dashed border-neutral-300"
            )}
          >
            <span className="font-mono text-[10px] text-neutral-500">{formatSessionDate(entry.sessionDate)}</span>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                hasValue ? "text-neutral-600" : "font-medium text-neutral-400"
              )}
            >
              {hasValue ? `${entry.set!.actualReps}×${entry.set!.actualWeight}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
