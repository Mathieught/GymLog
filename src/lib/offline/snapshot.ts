"use client";

import { replaceLocalTemplates, setMeta } from "@/lib/offline/db";
import type { LibraryExercise, TemplateSnapshot } from "@/lib/offline/types";

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
      const { templates, library } = (await res.json()) as { templates: TemplateSnapshot[]; library: LibraryExercise[] };
      await replaceLocalTemplates(templates.map((t) => ({ ...t, updatedAt: Date.now() })));
      await setMeta("library", library);
    } catch {
      // Pas grave : on retentera à la prochaine navigation/reconnexion.
    } finally {
      warming = false;
    }
  })();
}
