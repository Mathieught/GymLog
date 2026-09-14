"use client";

import { useEffect, useState } from "react";
import { getLocalSession, getMeta } from "@/lib/offline/db";
import { localSessionToSeed } from "@/lib/offline/local-seed";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

// Page de secours servie par le service worker (src/app/sw.ts) quand une navigation échoue sans
// correspondance en cache — typiquement : l'app est relancée hors ligne sur une séance créée
// localement, jamais rendue côté serveur, ou tout simplement avant la première visite en ligne
// (rien encore en cache). Lit IndexedDB directement pour reprendre la séance en cours, sans
// jamais dépendre du réseau.
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

  // Un lien/bouton "retour" ne suffit pas : dans une PWA installée (pas de barre d'adresse), un
  // clic qui échoue encore laisse l'utilisateur coincé sans recours. On recharge automatiquement
  // dès que le réseau revient (le rechargement retente une vraie navigation réseau).
  useEffect(() => {
    function handleOnline() {
      // Rechargement complet volontaire (pas router.push) : on veut une vraie navigation
      // réseau qui repasse par le service worker, pas une transition client sur un état qui
      // vient justement de planter.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/history";
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  if (seed === "loading") return null;

  if (seed === "none") {
    return (
      <>
        <PageHeader backHref="/history" />
        <Container>
          <h1 className="text-2xl font-semibold">Hors ligne</h1>
          <p className="mt-4 text-neutral-500">
            Aucune séance en cours n&apos;est disponible hors ligne pour l&apos;instant. Ça arrive à la
            toute première ouverture de l&apos;app : tant qu&apos;aucune page n&apos;a encore été chargée
            avec du réseau, rien n&apos;est encore en cache sur l&apos;appareil.
          </p>
          <p className="mt-2 text-neutral-500">
            Reconnecte-toi (Wi-Fi ou données mobiles) : la page se rechargera automatiquement, ou
            appuie sur le bouton ci-dessous.
          </p>
          <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
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
