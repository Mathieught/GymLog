import { format } from "date-fns";
import { fr } from "date-fns/locale";

type HistoryEntry = {
  sessionDate: Date;
  actualWeight: number | null;
  actualReps: number | null;
};

// Petit récap : ce qui a été fait sur ce même numéro de série lors des dernières séances
// (jusqu'à 3), de la plus récente à la plus ancienne. Rendu à l'intérieur du bloc de la série
// concernée (par le composant appelant), jamais comme une ligne flottante entre deux séries.
export function SetHistoryRecap({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <p className="text-[11px] text-neutral-400">
      {entries.map((entry, index) => (
        <span key={index}>
          {index > 0 && " · "}
          <span className="tabular-nums">
            {entry.actualReps ?? "—"}×{entry.actualWeight ?? "—"}kg
          </span>{" "}
          <span className="text-neutral-300">
            ({format(entry.sessionDate, "d/MM", { locale: fr })})
          </span>
        </span>
      ))}
    </p>
  );
}
