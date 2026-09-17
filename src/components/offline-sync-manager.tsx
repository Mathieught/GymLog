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

  // Même raison qu'au-dessus (navigation client = jamais de nouveau document) : un onglet resté
  // ouvert pendant qu'un déploiement passe continue d'exécuter l'ancien JS indéfiniment, même en
  // changeant d'onglet dans l'app (Séances/Historique/...) — rien ne le force jamais à recharger.
  // Le service worker (skipWaiting + clientsClaim, voir sw.ts) prend la main dès qu'une nouvelle
  // version est prête ; on écoute ce changement de contrôleur pour recharger une seule fois, mais
  // seulement si l'onglet était déjà contrôlé par un ancien SW — sinon (tout premier lancement,
  // pas encore de service worker actif) ce même événement se déclenche aussi et provoquerait un
  // rechargement inutile dès la première visite.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.serviceWorker.controller) return;
    let reloaded = false;
    function handleControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  return null;
}
