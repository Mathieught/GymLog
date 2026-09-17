"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 1) {
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Chronomètre de séance, calé sur `startedAt` (jamais un simple compteur local) : reste juste même
// après un rechargement de page ou un passage en arrière-plan. Rien n'est rendu avant le premier
// tick côté client (mêmes raisons que le pattern `mounted` déjà utilisé ailleurs dans l'app) pour
// éviter tout écart d'hydratation entre l'heure du rendu serveur et celle du client.
export function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    const startedAtMs = new Date(startedAt).getTime();
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAtMs));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (elapsedMs === null) return null;

  return (
    <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-accent-deep">
      <Timer className="h-3.5 w-3.5" aria-hidden="true" />
      {formatElapsed(elapsedMs)}
    </span>
  );
}
