"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, History, Dumbbell, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/workouts", label: "Séances", icon: ListChecks },
  { href: "/history", label: "Historique", icon: History },
  { href: "/exercises", label: "Exercices", icon: Dumbbell },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

// Toute page liée à une séance précise sous /workouts (détail, suivi en cours — les formulaires de
// création/édition sont désormais des popups, pas des pages, voir WorkoutFormSheet) : dès qu'on
// quitte la liste pour entrer "dans" une séance, on s'y concentre. Le bouton retour de l'en-tête
// suffit pour en sortir. La page détail d'une séance passée (/sessions/[id], accessible depuis
// l'historique) garde la nav.
const HIDDEN_NAV_PATTERNS = [/^\/workouts\/.+/];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  // Pas de menu tant qu'on n'est pas connecté : tous ses liens ramèneraient de toute façon à la
  // page de connexion.
  if (pathname === "/login" || HIDDEN_NAV_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null;
  }

  return (
    // Le conteneur lui-même n'a aucun arrière-plan : seule la pastille flottante en a un, pour
    // se poser sur le fond de la page plutôt que sur une barre blanche pleine largeur. Le padding
    // bas suit l'encoche de sécurité du téléphone (barre de gestes/home indicator) pour ne
    // jamais coller au bord ni passer dessous.
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      <div className="flex w-full max-w-lg items-center gap-0.5 rounded-full border border-neutral-200/80 bg-neutral-100/90 p-0.5 shadow-lg shadow-black/5 backdrop-blur-md">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors",
        active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:bg-white/60"
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        {/* Seul marqueur de couleur de la barre du bas : l'onglet actif se distinguait déjà par la
            pastille blanche, ce point n'ajoute qu'un repère de progression cohérent avec le reste
            de l'accent (chrono, série validée), pas une redite du "actif". */}
        {active && (
          <span className="absolute -top-0.5 -right-0.5 h-[5px] w-[5px] rounded-full bg-accent" />
        )}
      </span>
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </Link>
  );
}
