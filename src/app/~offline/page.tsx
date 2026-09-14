"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalSession, getMeta } from "@/lib/offline/db";
import { localSessionToSeed } from "@/lib/offline/local-seed";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";

// Page de secours servie par le service worker (src/app/sw.ts) quand une navigation échoue sans
// correspondance en cache — typiquement : l'app est relancée hors ligne sur une séance créée
// localement, jamais rendue côté serveur. Lit IndexedDB directement pour reprendre la séance en
// cours, sans jamais dépendre du réseau.
export default function OfflineFallbackPage() {
  const [seed, setSeed] = useState<SessionSeed | "none" | "loading">("loading");

  useEffect(() => {
    (async () => {
      const activeSessionId = await getMeta<string>("activeSessionId");
      if (!activeSessionId) {
        setSeed("none");
        return;
      }
      const local = await getLocalSession(activeSessionId);
      if (!local || local.completedAt) {
        setSeed("none");
        return;
      }
      setSeed(await localSessionToSeed(local));
    })();
  }, []);

  if (seed === "loading") return null;

  if (seed === "none") {
    return (
      <>
        <PageHeader backHref="/history" />
        <Container>
          <h1 className="text-2xl font-semibold">Hors ligne</h1>
          <p className="mt-4 text-neutral-500">
            Aucune séance en cours n&apos;est disponible hors ligne pour l&apos;instant. Reconnectez-vous
            pour charger vos données.
          </p>
          <Link href="/history" className="mt-4 inline-block text-sm underline">
            Retour à l&apos;historique
          </Link>
        </Container>
      </>
    );
  }

  return (
    <SessionTracker
      backHref="/history"
      seed={seed}
      activeExerciseId={seed.groups[0]?.exerciseId ?? ""}
      allowRemove
    />
  );
}
