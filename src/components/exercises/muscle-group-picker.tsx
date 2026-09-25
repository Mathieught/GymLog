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
// anatomiques) : on retombe sur une icône générique de la bibliothèque déjà utilisée ailleurs,
// tracée en accent-deep comme la zone ciblée des autres (la silhouette discrète la rendrait illisible).
const AutresIcon: MuscleIcon = ({ className }) => (
  <MoreHorizontal className={cn(className, "text-accent-deep group-aria-pressed:text-accent-contrast")} />
);

export const MUSCLE_ICONS: Record<(typeof MUSCLE_GROUPS)[number], MuscleIcon | LucideIcon> = {
  Pectoraux: PectorauxIcon,
  Dos: DosIcon,
  Épaules: EpaulesIcon,
  Biceps: BicepsIcon,
  Triceps: TricepsIcon,
  "Avant-bras": AvantBrasIcon,
  Abdominaux: AbdominauxIcon,
  Jambes: JambesIcon,
  Autres: AutresIcon,
};

// Icône discrète du groupe musculaire principal d'un exercice (liste d'un programme, rail de
// séance) : silhouette ton sur ton (même teinte que le sélecteur), zone ciblée en accent-deep.
export function ExerciseMuscleIcon({ muscles, className }: { muscles: string[]; className?: string }) {
  const Icon = MUSCLE_ICONS[muscles[0] as keyof typeof MUSCLE_ICONS];
  if (!Icon) return null;
  return <Icon className={cn("text-muscle", className)} />;
}

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
      <div className="grid grid-cols-3 gap-2">
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
                "group flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center transition-colors",
                // L'accent marque un état "sélectionné/actif" partout ailleurs dans l'app (onglet
                // actif, série faite, rail de progression) : cette sélection suit la même
                // convention plutôt que le remplissage noir/blanc réservé aux boutons d'action.
                selected
                  ? "border-accent bg-accent text-accent-contrast/30"
                  : // Même vignette "ton sur ton" que partout ailleurs (voir muscle-tile dans globals.css).
                    "border-neutral-200 bg-muscle-tile text-muscle hover:border-accent-deep/50"
              )}
            >
              <Icon className="h-11 w-11" />
              <span className="text-[13px] font-medium leading-tight text-neutral-900 group-aria-pressed:text-accent-contrast">{muscle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
