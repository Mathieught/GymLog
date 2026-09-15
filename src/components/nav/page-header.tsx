import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { HeaderOptions } from "@/components/nav/header-options";
import { cn } from "@/lib/utils";

export function PageHeader({
  backHref,
  title,
  right,
  className,
}: {
  backHref?: string;
  // Titre affiché dans la barre elle-même (au lieu d'un <h1> séparé sous le header) : reste
  // visible au scroll puisque la barre est sticky. Utilisé sur les pages où le titre partage sa
  // ligne avec une action (ex : détail/formulaire de séance) ; les autres pages gardent leur
  // grand titre dans le contenu.
  title?: ReactNode;
  right?: ReactNode;
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
          <div className="min-w-0 flex-1 truncate text-xl font-bold text-neutral-900">{title}</div>
        )}
        <div className="flex shrink-0 items-center gap-2">{right ?? (title !== undefined ? null : <HeaderOptions />)}</div>
      </div>
    </header>
  );
}
