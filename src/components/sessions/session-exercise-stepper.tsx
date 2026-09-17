"use client";

import { useEffect, useState } from "react";
import { Check, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSCLE_ICONS } from "@/components/exercises/muscle-group-picker";

const FLASH_VISIBLE_MS = 1200;
const FLASH_FADE_MS = 300;

type StepperGroup = {
  exerciseId: string;
  exercise: { name: string; muscle: string[] };
  sets: { completed: boolean }[];
};

// Purement informatif : indique la position dans la séance, ne navigue pas (la navigation se
// fait par swipe ou par les liens Précédent/Suivant).
export function SessionExerciseStepper({
  groups,
  activeExerciseId,
}: {
  groups: StepperGroup[];
  activeExerciseId: string;
}) {
  return (
    <ol className="flex flex-shrink-0 flex-row items-center">
      {groups.map((group, index) => {
        const isActive = group.exerciseId === activeExerciseId;
        const isDone = group.sets.length > 0 && group.sets.every((set) => set.completed);
        const MuscleIcon =
          MUSCLE_ICONS[group.exercise.muscle[0] as keyof typeof MUSCLE_ICONS] ?? Dumbbell;

        return (
          <li key={group.exerciseId} className="flex flex-row items-center">
            <span
              title={`${group.exercise.name} · ${group.exercise.muscle.join(", ")}`}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-all",
                isActive
                  ? "scale-110 border-neutral-900 bg-neutral-900 text-white shadow-md"
                  : isDone
                    ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                    : "border-neutral-200 bg-white text-neutral-400"
              )}
            >
              {isDone && !isActive ? (
                <Check className="h-3 w-3" />
              ) : (
                <MuscleIcon className="h-3.5 w-3.5" />
              )}
            </span>
            {index < groups.length - 1 && (
              <div className="h-px w-4 bg-neutral-200" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Remonte (via la key sur exerciseId côté appelant, voir SessionTracker) à chaque changement
// d'exercice, ce qui réarme naturellement l'affichage temporaire sans setState synchrone dans un
// effect du parent. Purement informatif (non cliquable) : juste de quoi se repérer un instant.
// Rendue dans le `below` du header (voir PageHeader) — fait donc partie du même bloc sticky, et
// disparaît proprement une fois démontée sans jamais laisser de blanc réservé sous le header.
export function SessionStepperFlash({
  groups,
  activeExerciseId,
}: {
  groups: StepperGroup[];
  activeExerciseId: string;
}) {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fading"), FLASH_VISIBLE_MS);
    const hideTimer = setTimeout(() => setPhase("hidden"), FLASH_VISIBLE_MS + FLASH_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn("transition-opacity duration-300", phase === "visible" ? "opacity-100" : "opacity-0")}
      aria-hidden={phase !== "visible"}
    >
      <SessionExerciseStepper groups={groups} activeExerciseId={activeExerciseId} />
    </div>
  );
}
