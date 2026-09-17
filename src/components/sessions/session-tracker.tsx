"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SessionCarousel } from "@/components/sessions/session-carousel";
import { SessionStepperFlash } from "@/components/sessions/session-exercise-stepper";
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
  // Reflète l'exercice affiché par le carousel (voir onActiveExerciseChange) : le fil de suivi
  // vit maintenant dans le header (below), un cran au-dessus du carousel, donc ne peut pas lire
  // son état interne directement.
  const [currentExerciseId, setCurrentExerciseId] = useState(activeExerciseId);

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
              <Button type="button" variant="secondary" size="sm" onClick={() => setPendingComplete(true)}>
                Terminer
              </Button>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">À démarrer</p>
          )
        }
        below={<SessionStepperFlash key={currentExerciseId} groups={groups} activeExerciseId={currentExerciseId} />}
      />
      <Container className="max-w-2xl">
        <SessionCarousel
          basePath={basePath}
          sessionId={sessionId}
          allowRemove={!completedAt}
          readOnly={!!completedAt}
          groups={groups}
          history={history}
          touchedExerciseIds={engine.touchedExerciseIds}
          initialActiveExerciseId={activeExerciseId}
          templateName={seed.templateName}
          onActiveExerciseChange={setCurrentExerciseId}
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
