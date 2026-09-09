"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SessionExerciseStepper } from "@/components/sessions/session-exercise-stepper";
import { cn } from "@/lib/utils";

type SwipeGroup = {
  exerciseId: string;
  exercise: { name: string; muscle: string };
  sets: { completed: boolean }[];
};

const SWIPE_THRESHOLD = 60;
const INDICATOR_DURATION_MS = 1200;

// Le stepper (position dans les exercices) n'occupe plus de place en permanence : il apparaît en
// survol quelques instants à chaque changement d'exercice, puis s'efface. Le changement se fait
// aussi par glissement horizontal (swipe droite = exercice suivant, swipe gauche = précédent).
export function ExerciseSwipeNav({
  basePath,
  groups,
  activeExerciseId,
  children,
}: {
  basePath: string;
  groups: SwipeGroup[];
  activeExerciseId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  // Un swipe réel a eu lieu : on avale le click qui suit pour ne pas déclencher le
  // bouton/lien/input que le glissement a traversé (ex. "+ Ajouter une série").
  const suppressNextClick = useRef(false);

  const activeIndex = groups.findIndex((g) => g.exerciseId === activeExerciseId);
  const prevGroup = groups[activeIndex - 1];
  const nextGroup = groups[activeIndex + 1];

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;

    suppressNextClick.current = true;
    if (dx > 0 && nextGroup) {
      router.push(`${basePath}?exercise=${nextGroup.exerciseId}`);
    } else if (dx < 0 && prevGroup) {
      router.push(`${basePath}?exercise=${prevGroup.exerciseId}`);
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
    <div
      className="relative touch-pan-y select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <StepperFlash key={activeExerciseId} groups={groups} activeExerciseId={activeExerciseId} />
      {children}
    </div>
  );
}

// Remonte (via la key sur activeExerciseId côté appelant) à chaque changement d'exercice, ce qui
// réarme naturellement l'affichage temporaire sans avoir à déclencher un setState synchrone dans
// un effect. Purement informatif (non cliquable) : juste de quoi se repérer un instant.
function StepperFlash({
  groups,
  activeExerciseId,
}: {
  groups: SwipeGroup[];
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
        "pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-md backdrop-blur transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!visible}
    >
      <SessionExerciseStepper groups={groups} activeExerciseId={activeExerciseId} />
    </div>
  );
}
