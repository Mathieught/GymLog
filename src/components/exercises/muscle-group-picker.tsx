import {
  Shirt,
  Shield,
  StretchHorizontal,
  BicepsFlexed,
  HandFist,
  Footprints,
  Armchair,
  ChevronsUpDown,
  LayoutGrid,
  Hand,
  PersonStanding,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUPS } from "@/lib/constants";

export const MUSCLE_ICONS: Record<(typeof MUSCLE_GROUPS)[number], LucideIcon> = {
  Pectoraux: Shirt,
  Dos: Shield,
  Épaules: StretchHorizontal,
  Biceps: BicepsFlexed,
  Triceps: HandFist,
  Jambes: Footprints,
  Fessiers: Armchair,
  Mollets: ChevronsUpDown,
  Abdominaux: LayoutGrid,
  "Avant-bras": Hand,
  "Full body": PersonStanding,
};

export function MuscleGroupPicker({
  id,
  name,
  value,
  onChange,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (muscle: string) => void;
}) {
  return (
    <div>
      <input type="hidden" id={id} name={name} value={value} />
      <div className="grid grid-cols-4 gap-2">
        {MUSCLE_GROUPS.map((muscle) => {
          const Icon = MUSCLE_ICONS[muscle];
          const selected = value === muscle;
          return (
            <button
              key={muscle}
              type="button"
              onClick={() => onChange(muscle)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition-colors",
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{muscle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
