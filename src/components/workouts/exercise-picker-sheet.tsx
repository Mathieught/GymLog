"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search } from "lucide-react";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ExerciseOption = {
  id: string;
  name: string;
  muscle: string[];
  targetSets: number;
};

// Popup mobile-friendly pour choisir un exercice à ajouter à la séance : même famille que
// SetValueSheet (bottom sheet plein écran, portail sur body), mais avec recherche texte + filtre
// par muscle repris de la page Exercices, pour retrouver un exercice dans une longue liste sans
// passer par un menu déroulant classique.
// Monté/démonté par le parent (plutôt qu'un prop `open` gardant le composant en vie caché) : l'état
// de recherche repart donc naturellement à zéro à chaque ouverture, sans effet dédié pour le reset.
export function ExercisePickerSheet({
  exercises,
  onClose,
  onSelect,
}: {
  exercises: ExerciseOption[];
  onClose: () => void;
  onSelect: (exercise: ExerciseOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const availableMuscles = useMemo(
    () => MUSCLE_GROUPS.filter((m) => exercises.some((exercise) => exercise.muscle.includes(m))),
    [exercises]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return exercises.filter(
      (exercise) =>
        (!muscle || exercise.muscle.includes(muscle)) &&
        (!normalizedQuery || exercise.name.toLowerCase().includes(normalizedQuery))
    );
  }, [exercises, muscle, query]);

  const groups = useMemo(
    () =>
      (muscle ? [muscle] : availableMuscles)
        .map((m) => ({
          muscle: m,
          exercises: filtered.filter((exercise) => exercise.muscle.includes(m)),
        }))
        .filter((group) => group.exercises.length > 0),
    [availableMuscles, muscle, filtered]
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Retour"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        {/* Toujours ouverte depuis une autre popup (WorkoutFormSheet) : flèche retour plutôt
            qu'une croix, puisque fermer celle-ci révèle la popup précédente. */}
        <div className="flex items-center gap-2 border-b border-neutral-100 px-2 py-2.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Retour"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 truncate text-center text-sm font-medium text-neutral-500">
            Ajouter un exercice
          </span>
          <div className="h-9 w-9" />
        </div>

        <div className="space-y-3 border-b border-neutral-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un exercice..."
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {availableMuscles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMuscle(null)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  muscle === null
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                )}
              >
                Tous
              </button>
              {availableMuscles.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMuscle(m === muscle ? null : m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    muscle === m
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">Aucun exercice trouvé.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.muscle}>
                  <h3 className="mb-2 text-sm font-medium text-neutral-500">{group.muscle}</h3>
                  <ul className="space-y-2">
                    {group.exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(exercise)}
                          className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-400"
                        >
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-sm text-neutral-500">{exercise.muscle.join(", ")}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
