"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOfflineSync } from "@/lib/offline/sync";
import { AUTHENTICATED_STORAGE_KEY } from "@/lib/offline/constants";
import { warmOfflineSnapshot } from "@/lib/offline/snapshot";

export function OfflineSyncManager({ isAuthenticated }: { isAuthenticated: boolean }) {
  useOfflineSync();
  const pathname = usePathname();

  // Marque l'appareil comme "déjà connecté au moins une fois" : sert à /~offline pour distinguer
  // une vraie première connexion (impossible sans réseau) d'un simple manque de données en cache.
  // Rafraîchit aussi la liste des programmes dès qu'il y a du réseau (voir snapshot.ts).
  useEffect(() => {
    if (!isAuthenticated) return;
    localStorage.setItem(AUTHENTICATED_STORAGE_KEY, "1");
    warmOfflineSnapshot();
    window.addEventListener("online", warmOfflineSnapshot);
    return () => window.removeEventListener("online", warmOfflineSnapshot);
  }, [isAuthenticated]);

  // Toute navigation dans l'app passe par le routeur client (Next ne récupère que le payload
  // RSC, jamais le document HTML complet) : le service worker ne met donc jamais en cache de quoi
  // servir un rechargement à froid hors ligne sur cette page, même après l'avoir "visitée". On
  // déclenche nous-même, en tâche de fond, la requête document complète que ferait un vrai
  // rechargement — le service worker l'intercepte et la met en cache comme n'importe quelle page.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    fetch(window.location.pathname + window.location.search, {
      headers: { Purpose: "prefetch" },
    }).catch(() => {});
  }, [isAuthenticated, pathname]);

  return null;
}
