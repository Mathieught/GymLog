"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SessionCarousel } from "@/components/sessions/session-carousel";
import { SessionProgressRail } from "@/components/sessions/session-progress-rail";
import { SessionTimer } from "@/components/sessions/session-timer";
import { useSessionEngine, type SessionSeed } from "@/lib/offline/session-engine";

// Point d'entrée unique du suivi de séance : possède le moteur local (voir
// src/lib/offline/session-engine.ts), qui fait toute la lecture/écriture sans jamais attendre le
// réseau. Utilisé aussi bien pour l'aperçu d'un programme (seed.sessionId === null) que pour une
// séance déjà démarrée — la bascule de l'un à l'autre se fait en place, sans navigation Next.js
// (voir le commentaire dans SessionCarousel), ce qui est ce qui permet de démarrer une séance sans
// aucun réseau.
export function SessionTracker({
  backHref,
  seed,
  activeExerciseId,
}: {
  backHref: string;
  seed: SessionSeed;
  activeExerciseId: string;
}) {
  const router = useRouter();
  const engine = useSessionEngine(seed);
  const { sessionId, completedAt, groups, history } = engine;
  const [pendingComplete, setPendingComplete] = useState(false);
  // Index de l'exercice affiché par le carousel : possédé ici (pas par SessionCarousel) pour que
  // le rail de progression du header (voir SessionProgressRail, dans PageHeader `below`) puisse
  // aussi le piloter, pas seulement le swipe/les boutons Précédent-Suivant du carousel.
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, groups.findIndex((g) => g.exerciseId === activeExerciseId))
  );

  const basePath = sessionId ? `/sessions/${sessionId}` : `/workouts/${seed.workoutTemplateId}/session`;

  function handleComplete() {
    engine.completeSession();
    router.push("/history");
  }

  function confirmComplete() {
    setPendingComplete(false);
    handleComplete();
  }

  if (groups.length === 0) {
    return (
      <>
        <PageHeader backHref={backHref} title={seed.templateName} />
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
        title={seed.templateName}
        className="max-w-2xl"
        right={
          sessionId && completedAt ? (
            <p className="text-xs text-neutral-400">Terminée</p>
          ) : sessionId ? (
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
            <p className="text-xs text-neutral-400">À démarrer</p>
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
      <Container className="max-w-2xl">
        <SessionCarousel
          basePath={basePath}
          sessionId={sessionId}
          allowRemove={!completedAt}
          readOnly={!!completedAt}
          groups={groups}
          history={history}
          removedSetCounts={engine.removedSetCounts}
          activeIndex={activeIndex}
          templateName={seed.templateName}
          onActiveIndexChange={setActiveIndex}
          onAddSet={engine.addSet}
          onLogSet={engine.logSet}
          onUpdateSet={engine.updateSet}
          onResetSet={engine.resetSet}
          onRemoveSet={engine.removeSet}
          onCompleteSession={handleComplete}
        />
      </Container>

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
