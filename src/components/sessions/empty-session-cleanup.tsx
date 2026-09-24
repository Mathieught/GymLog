"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { discardEmptySessions } from "@/lib/offline/session-engine";

// À chaque changement de page : une séance démarrée sans aucune série validée, qu'on vient de
// quitter (accueil, autre onglet…), est annulée — voir discardEmptySessions.
export function EmptySessionCleanup() {
  const pathname = usePathname();
  useEffect(() => {
    void discardEmptySessions(pathname);
  }, [pathname]);
  return null;
}
