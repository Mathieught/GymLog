"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SessionCarousel } from "@/components/sessions/session-carousel";
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
  allowRemove,
}: {
  backHref: string;
  seed: SessionSeed;
  activeExerciseId: string;
  allowRemove: boolean;
}) {
  const router = useRouter();
  const engine = useSessionEngine(seed);
  const { sessionId, completedAt, groups, history } = engine;

  const basePath = sessionId ? `/sessions/${sessionId}` : `/workouts/${seed.workoutTemplateId}/session`;

  function handleComplete() {
    engine.completeSession();
    router.push("/history");
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
            <ConfirmSubmitButton
              type="button"
              variant="secondary"
              size="sm"
              confirmMessage="Terminer la séance ? Vous ne pourrez plus modifier les séries après."
              onClick={handleComplete}
            >
              Terminer
            </ConfirmSubmitButton>
          ) : (
            <p className="text-xs text-neutral-400">À démarrer</p>
          )
        }
      />
      <Container className="max-w-2xl">
        <SessionCarousel
          basePath={basePath}
          sessionId={sessionId}
          allowRemove={allowRemove && !completedAt}
          readOnly={!!completedAt}
          groups={groups}
          history={history}
          initialActiveExerciseId={activeExerciseId}
          onAddSet={engine.addSet}
          onLogSet={engine.logSet}
          onUpdateSet={engine.updateSet}
          onResetSet={engine.resetSet}
          onRemoveSet={engine.removeSet}
          onCompleteSession={handleComplete}
        />
      </Container>
    </>
  );
}
