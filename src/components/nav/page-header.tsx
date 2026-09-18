import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { HeaderOptions } from "@/components/nav/header-options";
import { cn } from "@/lib/utils";

export function PageHeader({
  backHref,
  title,
  right,
  below,
  className,
}: {
  backHref?: string;
  // Titre affiché dans la barre elle-même (au lieu d'un <h1> séparé sous le header) : reste
  // visible au scroll puisque la barre est sticky. Utilisé sur les pages où le titre partage sa
  // ligne avec une action (ex : détail/formulaire de séance) ; les autres pages gardent leur
  // grand titre dans le contenu.
  title?: ReactNode;
  right?: ReactNode;
  // Contenu additionnel sous la ligne principale, dans le même bloc sticky (ex : le fil de suivi
  // des exercices d'une séance) — reste donc ancré juste sous le header sans jamais réserver
  // d'espace une fois retiré : il fait partie du même élément sticky, pas d'un `fixed` séparé à
  // repositionner à la main pour chaque hauteur d'encoche.
  below?: ReactNode;
  className?: string;
}) {
  return (
    // padding-top calé sur l'encoche de sécurité (comme le padding-bottom de BottomNav), avec un
    // plancher de 24px : sur un écran sans encoche, env(safe-area-inset-top) vaut 0 et le header
    // collerait sinon au bord de l'écran.
    <header
      className="sticky top-0 z-10 bg-neutral-50"
      style={{ paddingTop: "max(env(safe-area-inset-top), 24px)" }}
    >
      <div className={cn("mx-auto flex max-w-lg items-center justify-between gap-2 px-4 pb-1.5", className)}>
        {backHref ? (
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
        {title !== undefined && (
          // Même taille/graisse que PageTitle (pages sans bouton retour), pour une cohérence
          // visuelle en changeant de page.
          <div className="min-w-0 flex-1 truncate text-xl font-semibold text-neutral-900">{title}</div>
        )}
        <div className="flex shrink-0 items-center gap-2">{right ?? (title !== undefined ? null : <HeaderOptions />)}</div>
      </div>
      {/* Pas de max-w/px-4 ici (contrairement à la ligne titre juste au-dessus) : le rail de
          progression d'une séance (voir SessionProgressRail) doit pouvoir s'étendre bord à bord de
          l'écran plutôt que de rester cantonné à la colonne de contenu. Chaque consommateur de
          `below` gère donc lui-même son propre alignement/padding interne. */}
      {below && <div className="pb-2">{below}</div>}
    </header>
  );
}
