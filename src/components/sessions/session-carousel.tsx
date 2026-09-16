"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { SessionExerciseStepper } from "@/components/sessions/session-exercise-stepper";
import { SetRow } from "@/components/sessions/set-row";
import { PreviousSetRow } from "@/components/sessions/previous-set-row";
import { SessionCompletionPrompt } from "@/components/sessions/session-completion-prompt";
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
  sessionId,
  allowRemove,
  readOnly,
  groups,
  history,
  initialActiveExerciseId,
  templateName,
  onAddSet,
  onLogSet,
  onUpdateSet,
  onResetSet,
  onRemoveSet,
  onCompleteSession,
}: {
  basePath: string;
  sessionId: string | null;
  allowRemove: boolean;
  // Séance déjà terminée : consultation uniquement, aucune série ne doit pouvoir être ajoutée,
  // modifiée ou supprimée (voir aussi la garde côté moteur dans session-engine.ts et côté serveur
  // dans session-mutations.ts, qui refusent ces mutations même si ce flag était contourné).
  readOnly: boolean;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  initialActiveExerciseId: string;
  // Nom de la séance (déjà affiché dans l'en-tête) : sert à ne pas répéter le muscle ciblé de
  // l'exercice quand il correspond au nom de la séance (ex. séance "Dos" contenant un exercice
  // ciblant "Dos") — voir ExercisePanel.
  templateName: string;
  onAddSet: (exerciseId: string, exerciseOrder: number) => void;
  onLogSet: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onUpdateSet: (setId: string, actualWeight: number, actualReps: number) => void;
  onResetSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onCompleteSession: () => void;
}) {
  const initialIndex = Math.max(
    0,
    groups.findIndex((g) => g.exerciseId === initialActiveExerciseId)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  // Propose la popup de fin de séance à chaque série (re)validée tant que tout est complet — pas
  // seulement au moment où le dernier "trou" se remplit : si l'utilisateur avait choisi
  // "Continuer" puis retouche une série (correction d'une erreur, ou simplement re-valider sans
  // rien changer), il a de nouveau explicitement confirmé quelque chose et veut probablement
  // clôturer. Ajusté pendant le rendu (pattern React recommandé pour réagir à un changement de
  // props sans passer par un effect) : pas de ref, juste de l'état comparé à son ancienne valeur.
  const [prevGroups, setPrevGroups] = useState(groups);
  if (groups !== prevGroups) {
    setPrevGroups(groups);
    // "Terminé" doit tenir compte des séries encore seulement suggérées par l'historique (pas
    // encore validées cette séance), pas juste de celles déjà enregistrées : sinon, valider
    // l'avant-dernière série d'un exercice qui en propose une de plus déclenche la popup trop tôt.
    const allDone = groups.every((g) => {
      const rows = buildSessionRows(g, history[g.exerciseId] ?? []);
      return rows.length > 0 && rows.every((row) => row.current?.completed === true);
    });
    if (sessionId && !readOnly && allDone) {
      setShowCompletionPrompt(true);
    }
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
  // serveur pour un simple changement d'exercice côté client) — et c'est aussi ce mécanisme qui
  // fait apparaître l'URL /sessions/[id] dès qu'une séance démarre depuis l'aperçu d'un programme
  // (basePath change alors de valeur, voir SessionTracker).
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
    <div className="relative">
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
                allowRemove={allowRemove}
                readOnly={readOnly}
                templateName={templateName}
                onAddSet={onAddSet}
                onLogSet={onLogSet}
                onUpdateSet={onUpdateSet}
                onResetSet={onResetSet}
                onRemoveSet={onRemoveSet}
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
          onComplete={onCompleteSession}
          onContinue={() => setShowCompletionPrompt(false)}
        />
      )}
    </div>
  );
}

// Remonte (via la key sur exerciseId côté appelant) à chaque changement d'exercice, ce qui
// réarme naturellement l'affichage temporaire sans setState synchrone dans un effect du parent.
// Purement informatif (non cliquable) : juste de quoi se repérer un instant. `fixed` en bas de
// l'écran (plutôt que l'ancien `sticky` en haut, qui restait dans le flux même invisible et
// laissait un grand blanc entre l'en-tête et l'exercice) : indépendant du scroll et du contenu du
// panneau actif, et ne réserve aucun espace une fois masqué.
function StepperFlash({
  groups,
  activeExerciseId,
}: {
  groups: SessionRowGroup[];
  activeExerciseId: string;
}) {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fading"), INDICATOR_DURATION_MS);
    const hideTimer = setTimeout(() => setPhase("hidden"), INDICATOR_DURATION_MS + 300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-20 flex justify-center transition-opacity duration-300",
        phase === "visible" ? "opacity-100" : "opacity-0"
      )}
      style={{ bottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      aria-hidden={phase !== "visible"}
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
  allowRemove,
  readOnly,
  templateName,
  onAddSet,
  onLogSet,
  onUpdateSet,
  onResetSet,
  onRemoveSet,
}: {
  group: SessionRowGroup;
  history: PreviousPerformance[];
  allowRemove: boolean;
  readOnly: boolean;
  templateName: string;
  onAddSet: (exerciseId: string, exerciseOrder: number) => void;
  onLogSet: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onUpdateSet: (setId: string, actualWeight: number, actualReps: number) => void;
  onResetSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
}) {
  const rows = buildSessionRows(group, history);
  // Le nom de la séance est déjà affiché juste au-dessus (en-tête) : ne pas répéter un muscle qui
  // le reprend mot pour mot (ex. séance "Dos" listant un exercice ciblant "Dos"). Les autres
  // muscles ciblés par l'exercice restent affichés normalement.
  const normalizedTemplateName = templateName.trim().toLowerCase();
  const displayedMuscles = group.exercise.muscle.filter(
    (muscle) => muscle.trim().toLowerCase() !== normalizedTemplateName
  );

  return (
    <div className="pr-1">
      <div className="mb-4 border-b border-neutral-100 pb-3">
        <p className="font-medium">{group.exercise.name}</p>
        {displayedMuscles.length > 0 && (
          <p className="text-sm text-neutral-500">{displayedMuscles.join(", ")}</p>
        )}
      </div>

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
                  recap={row.recap}
                  locked={readOnly || !row.unlocked}
                  onUpdate={onUpdateSet}
                  onReset={onResetSet}
                  onRemove={onRemoveSet}
                />
              </li>
            ) : (
              <li key={`previous-${row.setNumber}`}>
                <PreviousSetRow
                  previousSet={row.previous!}
                  exerciseId={group.exerciseId}
                  exerciseOrder={group.exerciseOrder}
                  recap={row.recap}
                  locked={readOnly || !row.unlocked}
                  onLog={onLogSet}
                />
              </li>
            )
          )}
        </ul>
      )}

      {!readOnly && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => onAddSet(group.exerciseId, group.exerciseOrder)}
        >
          + Ajouter une série
        </Button>
      )}
    </div>
  );
}
