"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { SetRow } from "@/components/sessions/set-row";
import { PreviousSetRow } from "@/components/sessions/previous-set-row";
import { SessionCompletionPrompt } from "@/components/sessions/session-completion-prompt";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

const SWIPE_THRESHOLD_PX = 60;
const DEADZONE_PX = 8;

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
  touchedExerciseIds,
  initialActiveExerciseId,
  templateName,
  onActiveExerciseChange,
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
  // Exercices ayant eu une vraie série cette séance (voir touchedExerciseIds dans
  // session-engine.ts) : coupe les suggestions d'historique pour ceux-là dans ExercisePanel.
  touchedExerciseIds: string[];
  initialActiveExerciseId: string;
  // Nom de la séance (déjà affiché dans l'en-tête) : sert à ne pas répéter le muscle ciblé de
  // l'exercice quand il correspond au nom de la séance (ex. séance "Dos" contenant un exercice
  // ciblant "Dos") — voir ExercisePanel.
  templateName: string;
  // Notifie le parent (SessionTracker) du changement d'exercice actif : le fil de suivi vit
  // maintenant dans le header (voir PageHeader `below`), pas ici, car ce composant ne connaît que
  // le panneau visible, pas la zone sticky au-dessus de lui.
  onActiveExerciseChange?: (exerciseId: string) => void;
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
      // false volontaire ici (pas touchedExerciseIds) : "Terminé" doit continuer à tenir compte
      // des séries encore seulement suggérées par l'historique, indépendamment de l'affichage.
      const rows = buildSessionRows(g, history[g.exerciseId] ?? [], false);
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

  useEffect(() => {
    onActiveExerciseChange?.(groups[activeIndex].exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, groups]);

  function goTo(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), groups.length - 1));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Un appui qui démarre sur la petite icône d'action d'une série (reset/suppression, voir
    // data-no-swipe dans SetRow) ne doit jamais pouvoir être requalifié en swipe : au toucher, un
    // micro-mouvement du doigt pendant l'appui est quasi inévitable, ce qui basculait
    // dragging=true, capturait le pointeur, et avalait ensuite le clic destiné au bouton (voir
    // handleClickCapture) — le bouton semblait alors ne "rien faire". Volontairement limité à ce
    // seul bouton (pas au gros bouton "valeur" ni à "+ Ajouter une série", qui occupent presque
    // toute la largeur de la rangée) : sinon un swipe qui démarre normalement au milieu de l'écran
    // ne pourrait quasiment plus jamais s'amorcer.
    if ((event.target as HTMLElement).closest("[data-no-swipe]")) {
      pointerStart.current = null;
      return;
    }
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

  return (
    <div className="relative">
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
                touched={touchedExerciseIds.includes(group.exerciseId)}
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

function ExercisePanel({
  group,
  history,
  touched,
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
  touched: boolean;
  allowRemove: boolean;
  readOnly: boolean;
  templateName: string;
  onAddSet: (exerciseId: string, exerciseOrder: number) => void;
  onLogSet: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onUpdateSet: (setId: string, actualWeight: number, actualReps: number) => void;
  onResetSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
}) {
  const rows = buildSessionRows(group, history, touched);
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
