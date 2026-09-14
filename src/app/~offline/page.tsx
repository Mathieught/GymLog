"use client";

import { useEffect, useState } from "react";
import { getLocalSession, getMeta, hasAnyLocalData } from "@/lib/offline/db";
import { localSessionToSeed } from "@/lib/offline/local-seed";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

type FallbackState = SessionSeed | "loading" | "no-active-session" | "never-authenticated";

// Page de secours servie par le service worker (src/app/sw.ts) quand une navigation échoue sans
// correspondance en cache — typiquement : l'app est relancée hors ligne sur une séance créée
// localement, jamais rendue côté serveur, ou tout simplement avant la première visite en ligne
// (rien encore en cache). Lit IndexedDB directement pour reprendre la séance en cours, sans
// jamais dépendre du réseau.
export default function OfflineFallbackPage() {
  const [state, setState] = useState<FallbackState>("loading");

  useEffect(() => {
    (async () => {
      const activeSessionId = await getMeta<string>("activeSessionId");
      if (activeSessionId) {
        const local = await getLocalSession(activeSessionId);
        if (local && !local.completedAt) {
          setState(await localSessionToSeed(local));
          return;
        }
      }
      // Pas de séance à reprendre : distinguer "déjà utilisé l'app en ligne, juste rien en
      // attente là" de "jamais connecté depuis cet appareil" — se connecter est structurellement
      // impossible hors ligne dans le second cas (OAuth a besoin du réseau), donc le message doit
      // être clair plutôt que de laisser croire à un bug.
      setState((await hasAnyLocalData()) ? "no-active-session" : "never-authenticated");
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

  if (state === "loading") return null;

  if (state === "never-authenticated") {
    return (
      <Container className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Connexion impossible hors ligne</h1>
        <p className="text-neutral-500">
          Cet appareil ne s&apos;est encore jamais connecté : il n&apos;a donc aucune donnée ni espace
          personnel en local. La toute première connexion se fait avec Google, ce qui demande du
          réseau.
        </p>
        <p className="text-neutral-500">
          Active le Wi-Fi ou les données mobiles, puis connecte-toi une première fois avec ton
          compte.
        </p>
        <Button type="button" className="mt-2" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Container>
    );
  }

  if (state === "no-active-session") {
    return (
      <Container className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Hors ligne</h1>
        <p className="text-neutral-500">
          Aucune séance en cours n&apos;est disponible hors ligne pour l&apos;instant.
        </p>
        <p className="text-neutral-500">
          Reconnecte-toi (Wi-Fi ou données mobiles) : la page se rechargera automatiquement, ou
          appuie sur le bouton ci-dessous.
        </p>
        <Button type="button" className="mt-2" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Container>
    );
  }

  return (
    <SessionTracker
      backHref="/history"
      seed={state}
      activeExerciseId={state.groups[0]?.exerciseId ?? ""}
      allowRemove
    />
  );
}
