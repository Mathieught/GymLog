import { MoreHorizontal, type LucideIcon } from "lucide-react";
import {
  PectorauxIcon,
  DosIcon,
  EpaulesIcon,
  BicepsIcon,
  TricepsIcon,
  AvantBrasIcon,
  AbdominauxIcon,
  JambesIcon,
} from "@/components/exercises/muscle-icons";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUPS } from "@/lib/constants";

type MuscleIcon = (props: { className?: string }) => React.ReactElement;

// "Autres" n'a pas d'illustration dédiée dans le design (contrairement aux 8 groupes
// anatomiques) : on retombe sur une icône générique de la bibliothèque déjà utilisée ailleurs.
export const MUSCLE_ICONS: Record<(typeof MUSCLE_GROUPS)[number], MuscleIcon | LucideIcon> = {
  Pectoraux: PectorauxIcon,
  Dos: DosIcon,
  Épaules: EpaulesIcon,
  Biceps: BicepsIcon,
  Triceps: TricepsIcon,
  "Avant-bras": AvantBrasIcon,
  Abdominaux: AbdominauxIcon,
  Jambes: JambesIcon,
  Autres: MoreHorizontal,
};

export function MuscleGroupPicker({
  id,
  name,
  value,
  onChange,
}: {
  id?: string;
  name: string;
  value: string[];
  onChange: (muscles: string[]) => void;
}) {
  function toggle(muscle: string) {
    onChange(
      value.includes(muscle) ? value.filter((m) => m !== muscle) : [...value, muscle]
    );
  }

  return (
    <div>
      {/* Les noms de muscle ne contiennent jamais de virgule : un champ texte joint suffit,
          pas besoin d'un <input> par valeur sélectionnée. */}
      <input type="hidden" id={id} name={name} value={value.join(",")} />
      <div className="grid grid-cols-5 gap-2">
        {MUSCLE_GROUPS.map((muscle) => {
          const Icon = MUSCLE_ICONS[muscle];
          const selected = value.includes(muscle);
          return (
            <button
              key={muscle}
              type="button"
              onClick={() => toggle(muscle)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors",
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-900 hover:border-neutral-400"
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
