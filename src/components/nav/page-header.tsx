import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Nom de la page parente affiché à côté de la flèche retour ("‹ Séances"), déduit de l'onglet visé
// (mêmes libellés que BottomNav) : chaque page dit ainsi d'où elle vient, sans que chaque appelant
// ait à le répéter. Un parent qui n'est pas un onglet (ex. un programme) passe `backLabel`.
const SECTION_LABELS: Record<string, string> = {
  "/workouts": "Séances",
  "/history": "Historique",
  "/exercises": "Exercices",
  "/settings": "Paramètres",
};

export function PageHeader({
  backHref,
  backLabel,
  title,
  right,
  below,
  className,
}: {
  backHref?: string;
  backLabel?: string;
  // Titre affiché dans la barre elle-même (au lieu d'un <h1> séparé sous le header) : reste
  // visible au scroll puisque la barre est sticky. Avec un retour nommé, il passe sur sa propre
  // ligne sous "‹ Parent" : la page parente en haut, la page courante en dessous — la hiérarchie se
  // lit de haut en bas, et le titre a toute la largeur au lieu de se tasser entre deux boutons.
  title?: ReactNode;
  right?: ReactNode;
  // Contenu additionnel sous la ligne principale, dans le même bloc sticky (ex : le fil de suivi
  // des exercices d'une séance) — reste donc ancré juste sous le header sans jamais réserver
  // d'espace une fois retiré : il fait partie du même élément sticky, pas d'un `fixed` séparé à
  // repositionner à la main pour chaque hauteur d'encoche.
  below?: ReactNode;
  className?: string;
}) {
  const label = backLabel ?? (backHref ? SECTION_LABELS[backHref] : undefined);
  const titleOnOwnRow = title !== undefined && !!label;

  return (
    // padding-top calé sur l'encoche de sécurité (comme le padding-bottom de BottomNav), avec un
    // plancher de 24px : sur un écran sans encoche, env(safe-area-inset-top) vaut 0 et le header
    // collerait sinon au bord de l'écran.
    <header
      className="sticky top-0 z-10 bg-neutral-50"
      style={{ paddingTop: "max(env(safe-area-inset-top), 24px)" }}
    >
      <div className={cn("mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 pb-1.5", className)}>
        {backHref && label ? (
          <Link
            href={backHref}
            className="-ml-2 flex h-8 min-w-0 items-center gap-0.5 rounded-full pr-2.5 pl-1 text-[15px] text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ) : backHref ? (
          <Link
            href={backHref}
            aria-label="Retour"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <div className="h-8 w-8 shrink-0" />
        )}
        {title !== undefined && !titleOnOwnRow && (
          // Même taille/graisse que PageTitle (pages sans bouton retour), pour une cohérence
          // visuelle en changeant de page.
          <div className="min-w-0 flex-1 truncate text-xl font-semibold text-neutral-900">{title}</div>
        )}
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
      {titleOnOwnRow && (
        <div
          className={cn(
            "mx-auto max-w-3xl truncate px-4 pb-2 text-xl font-semibold text-neutral-900",
            className
          )}
        >
          {title}
        </div>
      )}
      {/* Même largeur maximale que la ligne titre juste au-dessus (via `className`, pour une page
          qui la personnalise) : le padding horizontal reste au consommateur de `below` (voir
          SessionProgressRail) puisque certains contenus veulent leur propre répartition interne,
          mais l'alignement gauche/droite avec le reste du header doit toujours correspondre. */}
      {below && <div className={cn("mx-auto max-w-3xl pb-2", className)}>{below}</div>}
    </header>
  );
}
