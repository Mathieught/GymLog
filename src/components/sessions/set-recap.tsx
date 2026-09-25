import { useState } from "react";
import { cn, formatReps, formatWeight } from "@/lib/utils";
import { NoteSheet } from "@/components/sessions/note-sheet";
import type { SessionRowRecapEntry } from "@/lib/session-rows";

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

// Récap de LA MÊME série sur les séances passées (jusqu'à 3), rendu à l'intérieur de la carte de
// la série — jamais un bloc séparé — pour que la comparaison se fasse par position, sans recoller
// mentalement plusieurs séances. Chaque pastille est datée : une séance sans cette série (objectif
// de séries augmenté depuis) garde sa date mais affiche un tiret plutôt qu'un 0×0 trompeur.
//
// Un point signale qu'une note existe sur cette série passée (voir WorkoutSet.note) — même
// pastille (taille, couleur accent) que le repère de progression de la barre de nav du bas (voir
// NavItem dans bottom-nav.tsx), pour rester le seul vocabulaire de "petit point" de l'app.
// Positionné à l'intérieur de la pastille (pas en débord sur les bords) puisqu'ici rien ne joue le
// rôle du fond blanc qui l'isolait dans la barre de nav. Seules ces pastilles-là sont cliquables,
// pour rouvrir la note en LECTURE SEULE (voir NoteSheet, `onSave` omis) — seule la série de la
// séance en cours se modifie (voir SetRow), pas l'historique.
export function SetRecap({ entries, cardio = false }: { entries: SessionRowRecapEntry[]; cardio?: boolean }) {
  const [viewing, setViewing] = useState<{ setNumber: number; note: string } | null>(null);

  if (entries.length === 0) return null;

  // neutral-900/10 (pas white/10 : --color-white est le fond sombre de l'app, pas du blanc) pour un
  // filet clair discret, lisible aussi bien sur les fonds neutres des différents états.
  return (
    <>
      <div className="flex gap-1.5 border-t border-neutral-900/10 px-3 pb-2.5 pt-2">
        {entries.map((entry) => {
          // Un set peut exister sans valeur (créé puis jamais renseigné, actualReps/actualWeight
          // null) : traité comme absent ici, sinon on afficherait littéralement "null×null".
          const hasValue = entry.set?.actualReps != null && entry.set?.actualWeight != null;
          const note = entry.set?.note ?? null;
          return (
            <div
              key={entry.sessionDate.toISOString()}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-md px-1.5 py-1",
                // Superposition noire translucide (pas bg-neutral-100, une teinte fixe) : la pastille
                // s'assombrit relativement au fond qui la porte plutôt que de plaquer une couleur figée
                // par-dessus — elle se fond aussi bien dans une carte neutre (série pas encore validée)
                // que dans le fond vert accent-soft d'une série validée, au lieu d'y ressortir comme un
                // pavé gris étranger.
                hasValue ? "bg-black/20" : "border border-dashed border-neutral-300"
              )}
            >
              {note && (
                <>
                  {/* Recouvre toute la pastille : seule une série avec note existante est cliquable. */}
                  <button
                    type="button"
                    aria-label={`Voir la note — série ${entry.set!.setNumber}`}
                    onClick={() => setViewing({ setNumber: entry.set!.setNumber, note })}
                    className="absolute inset-0 rounded-md"
                  />
                  <span aria-hidden className="absolute right-1 top-1 h-[5px] w-[5px] rounded-full bg-accent" />
                </>
              )}
              <span className="font-mono text-[10px] text-neutral-500">{formatSessionDate(entry.sessionDate)}</span>
              <span
                className={cn(
                  "font-mono text-xs font-semibold tabular-nums",
                  hasValue ? "text-neutral-600" : "font-medium text-neutral-400"
                )}
              >
                {hasValue
                  ? cardio
                    ? `${formatReps(entry.set!.actualReps!)} min`
                    : `${formatReps(entry.set!.actualReps!)}×${formatWeight(entry.set!.actualWeight!)}`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {viewing && (
        <NoteSheet
          title={`Note — Série ${viewing.setNumber}`}
          initialNote={viewing.note}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
