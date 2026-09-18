import { cn } from "@/lib/utils";

// Un seul repère visuel pour les trois états d'une série, réutilisé par SetRow (faite / à faire) et
// PreviousSetRow (à faire / verrouillée) : la forme du contour porte l'état, pas seulement la
// couleur — faite = rempli, à faire = contour plein, verrouillée = contour pointillé. Remplace le
// numéro de série nu, sans ajouter d'élément qui entrerait en concurrence avec le bouton d'action à
// droite de la rangée.
export function SetStateBadge({
  setNumber,
  state,
}: {
  setNumber: number;
  state: "done" | "pending" | "locked";
}) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums",
        state === "done" && "bg-accent text-accent-contrast",
        state === "pending" && "border border-neutral-300 text-neutral-400",
        state === "locked" && "border border-dashed border-neutral-200 text-neutral-300"
      )}
    >
      {setNumber}
    </span>
  );
}
