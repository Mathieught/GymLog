"use client";

import { replaceLocalTemplates } from "@/lib/offline/db";
import type { TemplateSnapshot } from "@/lib/offline/types";

let warming = false;

// Rafraîchit la liste des programmes en local dès qu'il y a du réseau (voir
// offline-sync-manager.tsx) : c'est ce qui permet de choisir "quelle séance démarrer" depuis
// /~offline sans jamais avoir eu à ouvrir individuellement la page de chaque programme.
export function warmOfflineSnapshot() {
  if (warming) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  warming = true;
  (async () => {
    try {
      const res = await fetch("/api/offline/snapshot");
      if (!res.ok) return;
      const { templates } = (await res.json()) as { templates: TemplateSnapshot[] };
      await replaceLocalTemplates(templates.map((t) => ({ ...t, updatedAt: Date.now() })));
    } catch {
      // Pas grave : on retentera à la prochaine navigation/reconnexion.
    } finally {
      warming = false;
    }
  })();
}
