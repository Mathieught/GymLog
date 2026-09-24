"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Play, Timer } from "lucide-react";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SessionCarousel } from "@/components/sessions/session-carousel";
import { SessionProgressRail } from "@/components/sessions/session-progress-rail";
import { SessionTimer } from "@/components/sessions/session-timer";
import { useHideNav } from "@/components/nav/nav-visibility";
import { useSessionEngine, type SessionSeed } from "@/lib/offline/session-engine";
import { cn } from "@/lib/utils";

// Point d'entrée unique du suivi de séance : possède le moteur local (voir
// src/lib/offline/session-engine.ts), qui fait toute la lecture/écriture sans jamais attendre le
// réseau. Utilisé aussi bien pour l'aperçu d'un programme (seed.sessionId === null) que pour une
// séance déjà démarrée — la bascule de l'un à l'autre se fait en place, sans navigation Next.js
// (voir le commentaire dans SessionCarousel), ce qui est ce qui permet de démarrer une séance sans
// aucun réseau.
export function SessionTracker({
  backHref,
  backLabel,
  seed,
  activeExerciseId,
  showStartHint = false,
  startOnMount = false,
}: {
  backHref: string;
  // Nom de la page parente quand ce n'est pas un onglet (voir PageHeader) — le programme, pour une
  // séance lancée depuis lui. Il porte alors déjà le nom de la séance : le surtitre n'en garde que
  // l'état.
  backLabel?: string;
  seed: SessionSeed;
  activeExerciseId: string;
  // Bandeau "Valide ta première série pour démarrer" : réservé aux nouveaux utilisateurs.
  showStartHint?: boolean;
  // Arrivée par "Commencer la séance" : séance créée et chrono lancé sans attendre la 1re série.
  startOnMount?: boolean;
}) {
  const router = useRouter();
  const engine = useSessionEngine(seed);
  const { sessionId, completedAt, groups, history, start, discardIfEmpty } = engine;
  const [pendingComplete, setPendingComplete] = useState(false);
  // Index de l'exercice affiché par le carousel : possédé ici (pas par SessionCarousel) pour que
  // le rail de progression du header (voir SessionProgressRail, dans PageHeader `below`) puisse
  // aussi le piloter, pas seulement le swipe/les boutons Précédent-Suivant du carousel.
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, groups.findIndex((g) => g.exerciseId === activeExerciseId))
  );
  // Cache la nav du bas pendant toute la séance active, y compris pendant sa transition d'URL de
  // /workouts/[id]/session vers /sessions/[id] au premier "addSet"/"logSet" (voir
  // session-carousel.tsx) — un simple filtrage par chemin (l'ancienne approche) réaffichait la nav
  // pile à ce moment-là, puisque /sessions/[id] reste normalement visible (séance déjà terminée).
  useHideNav(!completedAt);

  // Confirmation brève quand la toute première série crée la séance — déclenchée par le geste de
  // l'utilisateur, pas par la reprise d'une séance locale au montage (qui change aussi sessionId).
  const [justStarted, setJustStarted] = useState(startOnMount);
  useEffect(() => {
    if (!justStarted) return;
    const timeout = setTimeout(() => setJustStarted(false), 2500);
    return () => clearTimeout(timeout);
  }, [justStarted]);

  function announceStart() {
    if (!sessionId) setJustStarted(true);
  }

  // Arrivée par "Commencer la séance" : séance créée d'emblée (confirmation affichée d'office, voir
  // justStarted). Une seule fois via un ref : au double montage du Strict Mode, le moteur remet son
  // stateRef sur l'état rendu (encore sans séance) et un 2e start() créerait une 2e séance, dont
  // l'une serait ensuite annulée par discardEmptySessions — parfois celle affichée.
  const startRequested = useRef(false);
  useEffect(() => {
    if (!startOnMount || startRequested.current) return;
    startRequested.current = true;
    start();
  }, [startOnMount, start]);

  const basePath = sessionId ? `/sessions/${sessionId}` : `/workouts/${seed.workoutTemplateId}/session`;

  function handleComplete() {
    // Terminer sans aucune série validée = annuler : rien à ranger dans l'historique.
    if (!discardIfEmpty()) engine.completeSession();
    router.push("/history");
  }

  function confirmComplete() {
    setPendingComplete(false);
    handleComplete();
  }

  if (groups.length === 0) {
    return (
      <>
        <PageHeader backHref={backHref} backLabel={backLabel} title={seed.templateName} />
        <Container>
          <p className="text-neutral-500">Aucun exercice dans cette séance.</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        // Hiérarchie explicite : parent dans le retour ("‹ Push" / "‹ Historique"), état de la
        // séance en surtitre, exercice affiché en titre.
        title={
          <span className="flex flex-col">
            <span
              className={cn(
                "truncate font-mono text-[11px] font-semibold tracking-wider uppercase",
                sessionId && !completedAt ? "text-accent-deep" : "text-neutral-500"
              )}
            >
              {!backLabel && `${seed.templateName} · `}
              {completedAt ? "terminée" : sessionId ? "en cours" : "à démarrer"}
            </span>
            <span className="truncate text-lg leading-snug">{groups[activeIndex].exercise.name}</span>
          </span>
        }
        right={
          sessionId && completedAt ? null : sessionId ? (
            <div className="flex items-center gap-2">
              {engine.startedAt && <SessionTimer startedAt={engine.startedAt} />}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-0"
                onClick={() => setPendingComplete(true)}
              >
                Terminer
              </Button>
            </div>
          ) : (
            // Chrono en attente : même pastille que SessionTimer, en pointillés, pour annoncer
            // qu'il partira tout seul à la première série (voir le bandeau plus bas).
            <span
              aria-label="Chrono en attente de la première série"
              className="flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-neutral-500"
            >
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              0:00
            </span>
          )
        }
        below={
          <SessionProgressRail
            groups={groups}
            history={history}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        }
      />
      <Container>
        {showStartHint && !sessionId && (
          // La séance n'est créée qu'à la première série renseignée (voir session-engine.ts) :
          // sans ce bandeau, rien ne dit à un nouvel utilisateur comment la démarrer.
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-accent-soft p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-neutral-900">Valide ta première série pour démarrer</p>
              <p className="mt-0.5 text-sm leading-snug text-neutral-700">
                Touche la série, ajuste le poids et les répétitions puis « Valider ». Le chrono se
                lance tout seul.
              </p>
            </div>
          </div>
        )}
        <SessionCarousel
          basePath={basePath}
          sessionId={sessionId}
          allowRemove={!completedAt}
          readOnly={!!completedAt}
          groups={groups}
          history={history}
          removedSetCounts={engine.removedSetCounts}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onAddSet={(...args) => {
            announceStart();
            engine.addSet(...args);
          }}
          onLogSet={(...args) => {
            announceStart();
            engine.logSet(...args);
          }}
          onUpdateSet={engine.updateSet}
          onResetSet={engine.resetSet}
          onRemoveSet={engine.removeSet}
          onDismissSuggestion={engine.dismissSuggestion}
          onUpdateNote={engine.updateNote}
          onCompleteSession={handleComplete}
        />
      </Container>

      {justStarted && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),24px)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3.5 text-neutral-50 shadow-2xl"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Séance démarrée</p>
            <p className="text-xs text-neutral-500">Chrono lancé</p>
          </div>
        </div>
      )}

      {pendingComplete && (
        <ConfirmDialog
          message="Terminer la séance ? Vous ne pourrez plus modifier les séries après."
          confirmLabel="Terminer"
          onConfirm={confirmComplete}
          onCancel={() => setPendingComplete(false)}
        />
      )}
    </>
  );
}
