"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { SetRow } from "@/components/sessions/set-row";
import { PreviousSetRow } from "@/components/sessions/previous-set-row";
import { SessionCompletionPrompt } from "@/components/sessions/session-completion-prompt";
import { buildSessionRows, type SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import { cn, isCardio } from "@/lib/utils";
import { useAppMode } from "@/components/app-mode";

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
  exerciseNames,
  removedSetCounts,
  activeIndex,
  onActiveIndexChange,
  onAddSet,
  onLogSet,
  onUpdateSet,
  onResetSet,
  onRemoveSet,
  onDismissSuggestion,
  onUpdateNote,
  onCompleteSession,
}: {
  // Nom de chaque exercice (variantes comprises) : sépare les séries faites sur une autre machine.
  exerciseNames: Record<string, string>;
  basePath: string;
  sessionId: string | null;
  allowRemove: boolean;
  // Séance déjà terminée : consultation uniquement, aucune série ne doit pouvoir être ajoutée,
  // modifiée ou supprimée (voir aussi la garde côté moteur dans session-engine.ts et côté serveur
  // dans session-mutations.ts, qui refusent ces mutations même si ce flag était contourné).
  readOnly: boolean;
  groups: SessionRowGroup[];
  history: Record<string, PreviousPerformance[]>;
  // Séries supprimées cette séance, par exercice (voir removedSetCounts dans session-engine.ts) :
  // réduit d'autant les suggestions encore proposées pour cet exercice dans ExercisePanel.
  removedSetCounts: Record<string, number>;
  // Index de l'exercice affiché : possédé par le parent (SessionTracker) pour que le rail de
  // progression dans le header (voir SessionProgressRail) puisse aussi le piloter, pas seulement
  // le swipe/les boutons Précédent-Suivant de ce composant.
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onAddSet: (exerciseId: string, exerciseOrder: number) => void;
  onLogSet: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onUpdateSet: (setId: string, actualWeight: number, actualReps: number) => void;
  onResetSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onDismissSuggestion: (exerciseId: string, sourceSetNumber: number) => void;
  onUpdateNote: (setId: string, note: string | null) => void;
  onCompleteSession: () => void;
}) {
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
      // 0 volontaire ici (pas removedSetCounts) : "Terminé" doit continuer à tenir compte des
      // séries encore seulement suggérées par l'historique/l'objectif, indépendamment de l'affichage.
      const rows = buildSessionRows(g, history, 0);
      return rows.length > 0 && rows.every((row) => row.current?.completed === true);
    });
    if (sessionId && !readOnly && allDone) {
      setShowCompletionPrompt(true);
    }
  }

  // "Commencer la séance" crée la séance avant toute série : on reste sur "Commence ici" tant
  // qu'aucune série n'est validée, pas seulement tant que la séance n'existe pas.
  const started = groups.some((g) => g.sets.some((s) => s.completed));

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
    onActiveIndexChange(Math.min(Math.max(index, 0), groups.length - 1));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Les popups ouvertes depuis une série (SetValueSheet, NoteSheet) sont rendues via un portail :
    // hors du carousel dans le DOM, mais React y fait quand même remonter leurs événements. Sans ce
    // filtre, glisser le doigt dans la popup changeait d'exercice derrière elle.
    if (!event.currentTarget.contains(event.target as Node)) {
      pointerStart.current = null;
      return;
    }
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
        // Débord de 12 px (repris en padding par chaque panneau) : overflow-hidden coupait le
        // halo animé de la série à renseigner (animate-ring-pulse, 10 px) sur les bords.
        className="relative -m-3 touch-pan-y select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div ref={trackRef} className="flex items-start">
          {groups.map((group, index) => (
            // Hauteur nulle hors panneau actif (contenu toujours visible en débord, donc pendant un
            // swipe) : sinon le rail prend la hauteur du plus long exercice, et un exercice court
            // (ex. cardio, une seule ligne) laisse un grand vide avant "Précédent/Suivant".
            <div key={group.exerciseId} className={cn("w-full shrink-0", index !== activeIndex && "h-0")}>
              <ExercisePanel
                group={group}
                history={history}
                exerciseNames={exerciseNames}
                removedCount={removedSetCounts[group.exerciseId] ?? 0}
                allowRemove={allowRemove}
                readOnly={readOnly}
                started={started}
                onAddSet={onAddSet}
                onLogSet={onLogSet}
                onUpdateSet={onUpdateSet}
                onResetSet={onResetSet}
                onRemoveSet={onRemoveSet}
                onDismissSuggestion={onDismissSuggestion}
                onUpdateNote={onUpdateNote}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-9 flex justify-between">
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
  exerciseNames,
  removedCount,
  allowRemove,
  readOnly,
  started,
  onAddSet,
  onLogSet,
  onUpdateSet,
  onResetSet,
  onRemoveSet,
  onDismissSuggestion,
  onUpdateNote,
}: {
  group: SessionRowGroup;
  history: Record<string, PreviousPerformance[]>;
  exerciseNames: Record<string, string>;
  removedCount: number;
  allowRemove: boolean;
  readOnly: boolean;
  // Séance déjà créée (au moins une série renseignée) : sinon on est encore sur l'aperçu, et la
  // prochaine série à renseigner est présentée comme celle qui lance la séance.
  started: boolean;
  onAddSet: (exerciseId: string, exerciseOrder: number) => void;
  onLogSet: (exerciseId: string, exerciseOrder: number, actualWeight: number, actualReps: number) => void;
  onUpdateSet: (setId: string, actualWeight: number, actualReps: number) => void;
  onResetSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onDismissSuggestion: (exerciseId: string, sourceSetNumber: number) => void;
  onUpdateNote: (setId: string, note: string | null) => void;
}) {
  const advanced = useAppMode().mode === "advanced";
  const allRows = buildSessionRows(group, history, removedCount);
  const cardio = isCardio(group.exercise.muscle);
  // Cardio en Basique : un seul bloc de durée, ni ajout ni retrait de série (le fractionné, plusieurs
  // séries, est réservé au mode Avancé).
  const singleBlock = cardio && !advanced;
  const rows = singleBlock ? allRows.slice(0, 1) : allRows;
  const nextSetNumber = readOnly
    ? undefined
    : rows.find((row) => row.unlocked && !row.current?.completed)?.setNumber;
  // Nom de l'exercice et muscles : affichés dans l'en-tête et le rail (voir SessionTracker,
  // SessionProgressRail), plus répétés ici.
  return (
    <div className="p-3">
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune série pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            // Changement de machine en cours d'exercice (séries déjà faites puis variante) : un
            // filet nommé sépare les séries de chaque exercice. Le titre dit déjà le reste.
            const switchedFrom = index > 0 && rows[index - 1].exerciseId !== row.exerciseId;
            const separator = switchedFrom && (
              <p className="flex items-center gap-2 pt-1.5 pb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-deep after:h-px after:flex-1 after:bg-neutral-300">
                Sur {exerciseNames[row.exerciseId] ?? "une variante"}
              </p>
            );
            return row.current ? (
              <li key={`${row.current.id}-${row.exerciseId}`}>
                {separator}
                <SetRow
                  set={row.current}
                  // Série validée : ce bouton annule le résultat (toujours permis) ; vierge : il la supprime.
                  canRemove={allowRemove && (!singleBlock || row.current.completed)}
                  previousSet={row.previous}
                  recap={row.recap}
                  locked={readOnly || !row.unlocked}
                  onUpdate={onUpdateSet}
                  onReset={onResetSet}
                  onRemove={onRemoveSet}
                  onUpdateNote={onUpdateNote}
                  cardio={cardio}
                />
              </li>
            ) : (
              // L'exercice dans la clé : choisir une variante remonte la ligne avec ses propres valeurs.
              <li key={`previous-${row.exerciseId}-${row.previous!.setNumber}`}>
                {separator}
                {!started && row.setNumber === nextSetNumber && (
                  <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-deep">
                    ↓ Commence ici
                  </p>
                )}
                <PreviousSetRow
                  setNumber={row.setNumber}
                  previousSet={row.previous!}
                  exerciseId={group.exerciseId}
                  exerciseOrder={group.exerciseOrder}
                  recap={row.recap}
                  locked={readOnly || !row.unlocked}
                  canRemove={allowRemove && !singleBlock}
                  highlight={row.setNumber === nextSetNumber ? (started ? "next" : "start") : undefined}
                  onLog={onLogSet}
                  onDismiss={onDismissSuggestion}
                  cardio={cardio}
                />
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && !(singleBlock && rows.length > 0) && (
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
