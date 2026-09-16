"use client";

import { useEffect, useState } from "react";
import { getLocalSession, getLocalTemplates, getMeta, hasAnyLocalData } from "@/lib/offline/db";
import { localSessionToSeed, templateSnapshotToSeed } from "@/lib/offline/local-seed";
import { SessionTracker } from "@/components/sessions/session-tracker";
import type { SessionSeed } from "@/lib/offline/session-engine";
import type { TemplateSnapshot } from "@/lib/offline/types";
import { AUTHENTICATED_STORAGE_KEY } from "@/lib/offline/constants";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FallbackState =
  | { kind: "loading" }
  | { kind: "session"; seed: SessionSeed }
  | { kind: "never-authenticated" }
  | { kind: "picker"; templates: TemplateSnapshot[] };

// Page de secours servie par le service worker (src/app/sw.ts) quand une navigation échoue sans
// correspondance en cache — typiquement : l'app est relancée hors ligne sur une page jamais
// chargée en document complet (voir le commentaire dans offline-sync-manager.tsx), ou sur une
// séance créée localement, jamais rendue côté serveur. Lit IndexedDB directement, sans jamais
// dépendre du réseau : reprend la séance en cours si il y en a une, sinon propose de démarrer
// depuis n'importe quel programme déjà mis en cache (voir src/lib/offline/snapshot.ts).
export default function OfflineFallbackPage() {
  const [state, setState] = useState<FallbackState>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      const activeSessionId = await getMeta<string>("activeSessionId");
      if (activeSessionId) {
        const local = await getLocalSession(activeSessionId);
        if (local && !local.completedAt) {
          setState({ kind: "session", seed: await localSessionToSeed(local) });
          return;
        }
      }

      // Pas de séance à reprendre : distinguer "jamais connecté depuis cet appareil" (se
      // connecter est structurellement impossible hors ligne, OAuth a besoin du réseau) de
      // "déjà utilisé l'app, propose de démarrer un programme en cache".
      const authenticatedBefore = (await hasAnyLocalData()) || localStorage.getItem(AUTHENTICATED_STORAGE_KEY) === "1";
      if (!authenticatedBefore) {
        setState({ kind: "never-authenticated" });
        return;
      }

      setState({ kind: "picker", templates: await getLocalTemplates() });
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

  if (state.kind === "loading") return null;

  if (state.kind === "never-authenticated") {
    return (
      <Container className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold">Connexion impossible hors ligne</h1>
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

  if (state.kind === "picker") {
    if (state.templates.length === 0) {
      return (
        <Container className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-xl font-semibold">Hors ligne</h1>
          <p className="text-neutral-500">
            Aucun programme n&apos;est encore disponible hors ligne sur cet appareil.
            Reconnecte-toi une fois : la liste se mettra en cache automatiquement pour la
            prochaine fois.
          </p>
          <Button type="button" className="mt-2" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Container>
      );
    }

    return (
      <Container className="pt-6">
        <h1 className="text-xl font-semibold">Démarrer une séance</h1>
        <p className="mt-1 text-sm text-neutral-500">Hors ligne — choisis un programme.</p>
        <ul className="mt-6 space-y-2">
          {state.templates.map((template) => (
            <li key={template.id}>
              <button type="button" className="w-full text-left" onClick={() => setState({ kind: "session", seed: templateSnapshotToSeed(template) })}>
                <Card className="transition-colors hover:border-neutral-400">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-neutral-500">{template.exercises.length} exercice(s)</p>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      </Container>
    );
  }

  return (
    <SessionTracker
      backHref="/history"
      seed={state.seed}
      activeExerciseId={state.seed.groups[0]?.exerciseId ?? ""}
      allowRemove
    />
  );
}
