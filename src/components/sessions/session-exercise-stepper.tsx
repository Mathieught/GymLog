import { Check, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSCLE_ICONS } from "@/components/exercises/muscle-group-picker";

type StepperGroup = {
  exerciseId: string;
  exercise: { name: string; muscle: string };
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
    <ol className="flex flex-shrink-0 flex-col items-center">
      {groups.map((group, index) => {
        const isActive = group.exerciseId === activeExerciseId;
        const isDone = group.sets.length > 0 && group.sets.every((set) => set.completed);
        const MuscleIcon =
          MUSCLE_ICONS[group.exercise.muscle as keyof typeof MUSCLE_ICONS] ?? Dumbbell;

        return (
          <li key={group.exerciseId} className="flex flex-col items-center">
            <span
              title={`${group.exercise.name} · ${group.exercise.muscle}`}
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
              <div className="h-4 w-px bg-neutral-200" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
