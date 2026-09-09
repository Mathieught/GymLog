import type { ReactNode } from "react";

// Hauteur fixe (h-9) alignée sur les boutons size="sm" : garantit la même hauteur
// d'en-tête sur toutes les pages, avec ou sans action, pour éviter un saut visuel
// lors de la navigation entre onglets.
export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex min-h-9 items-center justify-between">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}
