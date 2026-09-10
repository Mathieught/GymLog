"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { SessionExerciseStepper } from "@/components/sessions/session-exercise-stepper";
import { SetRow } from "@/components/sessions/set-row";
import { PreviousSetRow } from "@/components/sessions/previous-set-row";
import { SetHistoryRecap } from "@/components/sessions/set-history-recap";
import { SessionCompletionPrompt } from "@/components/sessions/session-completion-prompt";
import { addSet } from "@/lib/actions/sessions";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 60;
const DEADZONE_PX = 8;
const INDICATOR_DURATION_MS = 1200;

// Toutes les données (séries + historique) de tous les exercices sont déjà en mémoire côté
// client : changer d'exercice — par swipe ou par les boutons Précédent/Suivant — ne déclenche
// donc plus aucun aller-retour serveur. Le glissement suit le doigt en temps réel (transform
// appliqué directement au DOM via une ref, sans re-render React à chaque pointermove) puis
// s'anime jusqu'au panneau voisin ou revient à sa place selon le seuil franchi.
export function SessionCarousel({
  basePath,
  addSetArg,
  sessionId,
  allowRemove,
  groups,
  history,
  initialActiveExerciseId,
}: {
  basePath: string;
  addSetArg: string;
  sessionId?: string;
  allowRemove: boolean;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  initialActiveExerciseId: string;
}) {
  const initialIndex = Math.max(
    0,
    groups.findIndex((g) => g.exerciseId === initialActiveExerciseId)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  // Détecte la transition vers "toutes les séries validées" pour proposer la popup de fin de
  // séance une seule fois par passage à l'état complet, plutôt que de clôturer automatiquement en
  // silence. Ajusté pendant le rendu (pattern React recommandé pour réagir à un changement de
  // props sans passer par un effect) : pas de ref, juste de l'état comparé à son ancienne valeur.
  const [prevGroups, setPrevGroups] = useState(groups);
  const [wasAllDone, setWasAllDone] = useState(false);
  if (groups !== prevGroups) {
    setPrevGroups(groups);
    const allDone = groups.every((g) => g.sets.length > 0 && g.sets.every((s) => s.completed));
    if (sessionId && allDone && !wasAllDone) {
      setShowCompletionPrompt(true);
    }
    setWasAllDone(allDone);
  }

  const trackRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  // Un swipe réel a eu lieu : on avale le click qui suit pour ne pas déclencher le bouton/lien
  // que le glissement a traversé (ex. "+ Ajouter une série").
  const suppressNextClick = useRef(false);

  function applyTransform(offsetPx: number, animate: boolean) {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 220ms cubic-bezier(0.22,1,0.36,1)" : "none";
    el.style.transform = `translate3d(calc(${-activeIndex * 100}% + ${offsetPx}px), 0, 0)`;
  }

  // Recale le rail sur le panneau actif à chaque changement d'index (swipe, bouton, ou retour
  // arrière après un glissement sous le seuil), toujours animé.
  useLayoutEffect(() => {
    applyTransform(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Garde l'URL partageable/rechargeable sans passer par le routeur Next (pas de round-trip
  // serveur pour un simple changement d'exercice côté client).
  useEffect(() => {
    const url = `${basePath}?exercise=${groups[activeIndex].exerciseId}`;
    window.history.replaceState(null, "", url);
  }, [activeIndex, basePath, groups]);

  function goTo(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), groups.length - 1));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    dragging.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!dragging.current) {
      if (Math.abs(dx) < DEADZONE_PX && Math.abs(dy) < DEADZONE_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Intention verticale (scroll) : on abandonne le suivi de ce geste.
        pointerStart.current = null;
        return;
      }
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    // Léger effet élastique en bout de liste (pas d'exercice précédent/suivant).
    const atStart = activeIndex === 0 && dx > 0;
    const atEnd = activeIndex === groups.length - 1 && dx < 0;
    const offset = atStart || atEnd ? dx * 0.35 : dx;
    applyTransform(offset, false);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !dragging.current) return;
    dragging.current = false;
    suppressNextClick.current = true;

    const dx = event.clientX - start.x;
    if (dx <= -SWIPE_THRESHOLD_PX && activeIndex < groups.length - 1) {
      goTo(activeIndex + 1);
    } else if (dx >= SWIPE_THRESHOLD_PX && activeIndex > 0) {
      goTo(activeIndex - 1);
    } else {
      applyTransform(0, true);
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const activeGroup = groups[activeIndex];

  return (
    <div>
      <StepperFlash key={activeGroup.exerciseId} groups={groups} activeExerciseId={activeGroup.exerciseId} />

      <div
        className="relative touch-pan-y select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div ref={trackRef} className="flex items-start">
          {groups.map((group) => (
            <div key={group.exerciseId} className="w-full shrink-0">
              <ExercisePanel
                group={group}
                history={history[group.exerciseId] ?? []}
                addSetArg={addSetArg}
                allowRemove={allowRemove}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        {activeIndex > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => goTo(activeIndex - 1)}>
            ← Précédent
          </Button>
        ) : (
          <span />
        )}
        {activeIndex < groups.length - 1 ? (
          <Button variant="ghost" size="sm" onClick={() => goTo(activeIndex + 1)}>
            Suivant →
          </Button>
        ) : (
          <span />
        )}
      </div>

      {sessionId && showCompletionPrompt && (
        <SessionCompletionPrompt
          sessionId={sessionId}
          onContinue={() => setShowCompletionPrompt(false)}
        />
      )}
    </div>
  );
}

// Remonte (via la key sur exerciseId côté appelant) à chaque changement d'exercice, ce qui
// réarme naturellement l'affichage temporaire sans setState synchrone dans un effect du parent.
// Purement informatif (non cliquable) : juste de quoi se repérer un instant.
function StepperFlash({
  groups,
  activeExerciseId,
}: {
  groups: SessionRowGroup[];
  activeExerciseId: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), INDICATOR_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none sticky top-12 z-20 mb-2 flex justify-center transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!visible}
    >
      <div className="rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-md backdrop-blur">
        <SessionExerciseStepper groups={groups} activeExerciseId={activeExerciseId} />
      </div>
    </div>
  );
}

function ExercisePanel({
  group,
  history,
  addSetArg,
  allowRemove,
}: {
  group: SessionRowGroup;
  history: PreviousPerformance[];
  addSetArg: string;
  allowRemove: boolean;
}) {
  const rows = buildSessionRows(group, history);
  const previousPerformance = history[0];

  return (
    <div className="pr-1">
      <div className="mb-3">
        <p className="font-medium">{group.exercise.name}</p>
        <p className="text-sm text-neutral-500">{group.exercise.muscle}</p>
      </div>

      {previousPerformance && previousPerformance.sets.length > 0 && (
        <p className="mb-2 text-xs text-neutral-400">
          Dernière fois · {format(previousPerformance.sessionDate, "EEEE d MMMM", { locale: fr })}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune série pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) =>
            row.current ? (
              <li key={row.current.id}>
                <SetRow
                  set={row.current}
                  canRemove={allowRemove}
                  previousSet={row.previous}
                  locked={!row.unlocked}
                />
                <SetHistoryRecap entries={row.recap} />
              </li>
            ) : (
              <li key={`previous-${row.setNumber}`}>
                <PreviousSetRow
                  previousSet={row.previous!}
                  addSetArg={addSetArg}
                  exerciseId={group.exerciseId}
                  exerciseOrder={group.exerciseOrder}
                  locked={!row.unlocked}
                />
                <SetHistoryRecap entries={row.recap} />
              </li>
            )
          )}
        </ul>
      )}

      <form action={addSet.bind(null, addSetArg, group.exerciseId, group.exerciseOrder)} className="mt-3">
        <Button type="submit" variant="secondary" size="sm" className="w-full">
          + Ajouter une série
        </Button>
      </form>
    </div>
  );
}
