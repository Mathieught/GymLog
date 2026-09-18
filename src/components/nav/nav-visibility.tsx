"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const NavVisibilityContext = createContext<{
  hiddenCount: number;
  setHiddenCount: React.Dispatch<React.SetStateAction<number>>;
} | null>(null);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hiddenCount, setHiddenCount] = useState(0);
  return (
    <NavVisibilityContext.Provider value={{ hiddenCount, setHiddenCount }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export function useNavHidden() {
  const ctx = useContext(NavVisibilityContext);
  return (ctx?.hiddenCount ?? 0) > 0;
}

// Un compteur (pas juste un booléen) : une séance active doit garder la nav cachée même pendant sa
// transition d'URL de /workouts/[id]/session vers /sessions/[id] au premier "addSet"/"logSet" (voir
// session-carousel.tsx) — un simple pathname-matching (comme avant) réaffichait la nav pile à ce
// moment-là, puisque /sessions/[id] n'est normalement PAS caché (une séance déjà terminée y garde
// la nav). `hidden` doit donc venir de l'état de la séance (complétée ou non), pas de l'URL.
export function useHideNav(hidden: boolean) {
  const ctx = useContext(NavVisibilityContext);
  useEffect(() => {
    if (!ctx || !hidden) return;
    ctx.setHiddenCount((count) => count + 1);
    return () => ctx.setHiddenCount((count) => count - 1);
  }, [ctx, hidden]);
}
