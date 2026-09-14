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
// Une puce par séance (plutôt qu'une ligne de texte séparée par des points) : plus facile à
// scanner d'un coup d'œil, surtout à 3 entrées.
export function SetHistoryRecap({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1">
      {entries.map((entry, index) => (
        <li
          key={index}
          className="flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] tabular-nums text-neutral-500"
        >
          <span className="font-medium text-neutral-600">
            {entry.actualReps ?? "—"}×{entry.actualWeight ?? "—"}kg
          </span>
          <span className="text-neutral-400">{format(entry.sessionDate, "d/MM", { locale: fr })}</span>
        </li>
      ))}
    </ul>
  );
}
