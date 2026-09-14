"use client";

import { useEffect } from "react";
import { getOutbox, removeFromOutbox } from "@/lib/offline/db";

const RETRY_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 30000;

let syncing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// Déclenchée après chaque mutation locale et au retour du réseau : vide la file d'attente
// (outbox) vers le serveur, dans l'ordre. Ne bloque jamais l'UI — appelée en fire-and-forget.
export function syncNow() {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  syncing = true;
  drain().finally(() => {
    syncing = false;
  });
}

async function drain() {
  const outbox = await getOutbox();
  if (outbox.length === 0) return;

  try {
    const res = await fetch("/api/sessions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops: outbox.map(({ seq, op }) => ({ seq, op })) }),
    });
    if (!res.ok) throw new Error(`sync failed: ${res.status}`);

    const { appliedSeqs } = (await res.json()) as { appliedSeqs: number[] };
    if (appliedSeqs.length > 0) {
      await removeFromOutbox(appliedSeqs);
    }
    if (appliedSeqs.length < outbox.length) {
      scheduleRetry();
    }
  } catch {
    scheduleRetry();
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    syncNow();
  }, RETRY_DELAY_MS);
}

// Monté une fois dans le layout racine : relance la synchro au retour du réseau et par sondage
// de repli (au cas où l'événement "online" du navigateur serait manqué).
export function useOfflineSync() {
  useEffect(() => {
    syncNow();
    window.addEventListener("online", syncNow);
    const interval = setInterval(syncNow, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", syncNow);
      clearInterval(interval);
    };
  }, []);
}
