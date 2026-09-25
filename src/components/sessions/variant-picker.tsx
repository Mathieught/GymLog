"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { ExercisePickerSheet } from "@/components/workouts/exercise-picker-sheet";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/field";
import { cn, formatReps, formatWeight, isCardio } from "@/lib/utils";
import type { SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";
import type { LibraryExercise } from "@/lib/offline/types";

// Dernière perf d'une variante (1re série de sa dernière séance) : de quoi savoir avec quelle
// charge reprendre avant même de la choisir.
function lastPerformance(history: PreviousPerformance[] | undefined, cardio: boolean) {
  const last = history?.[0];
  const set = last?.sets.find((s) => s.actualReps != null && s.actualWeight != null);
  if (!last || !set) return "Jamais faite";
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(last.sessionDate);
  const value = cardio
    ? `${formatReps(set.actualReps!)} min`
    : `${formatReps(set.actualReps!)} × ${formatWeight(set.actualWeight!)} kg`;
  return `Dernière fois ${value} · ${date}`;
}

// Choix d'une variante pour un exercice du programme (mode Avancé) : même popup que l'ajout
// d'exercice à une séance (recherche, filtres, création si introuvable), ouverte sur le muscle de
// l'exercice prévu, avec en tête les variantes déjà faites à sa place. La création est allégée
// (nom + muscles) : les séries viennent de l'exercice prévu, la note s'ajoute plus tard.
export function VariantPicker({
  group,
  library,
  history,
  substitutes,
  onPick,
  onClose,
}: {
  group: SessionRowGroup;
  library: LibraryExercise[];
  history: Record<string, PreviousPerformance[]>;
  // Variantes déjà faites à la place de cet exercice, la plus récente d'abord.
  substitutes: string[];
  // null = retour à l'exercice prévu ; `created` = variante créée à l'instant.
  onPick: (target: LibraryExercise | null, created?: boolean) => void;
  onClose: () => void;
}) {
  const [createName, setCreateName] = useState<string | null>(null);
  const baseName = group.exercise.name;
  const byId = new Map(library.map((e) => [e.id, e]));
  const used = [...new Set([...(group.variantId ? [group.variantId] : []), ...substitutes])]
    .map((id) => byId.get(id))
    .filter((e): e is LibraryExercise => e !== undefined && e.id !== group.exerciseId);

  const top =
    group.variantId || used.length > 0 ? (
      <div className="space-y-2">
        {group.variantId && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-left transition-colors hover:border-neutral-400"
          >
            <RotateCcw className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <span>
              <span className="block font-medium">Revenir à {baseName}</span>
              <span className="block text-sm text-neutral-500">Prévu au programme</span>
            </span>
          </button>
        )}
        {used.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-accent-deep">
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              Déjà utilisées à sa place
            </h3>
            <ul className="space-y-2">
              {used.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => onPick(exercise)}
                    aria-current={exercise.id === group.variantId || undefined}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      exercise.id === group.variantId
                        ? "border-accent bg-accent-soft"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    )}
                  >
                    <p className="font-medium">{exercise.name}</p>
                    <p className="font-mono text-xs text-neutral-500">{lastPerformance(history[exercise.id], isCardio(exercise.muscle))}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    ) : undefined;

  return (
    <>
      {/* Avant le picker dans l'arbre, comme dans WorkoutTemplateForm : les deux se démontent
          ensemble après création, et body.overflow doit être restauré dans cet ordre. */}
      {createName !== null && (
        <VariantCreateSheet
          initialName={createName}
          baseName={baseName}
          initialMuscles={group.exercise.muscle}
          targetSets={group.exercise.targetSets}
          onClose={() => setCreateName(null)}
          onCreate={(exercise) => onPick(exercise, true)}
        />
      )}
      <ExercisePickerSheet
        title={`Remplacer ${baseName}`}
        exercises={library.filter((e) => e.id !== group.exerciseId)}
        initialMuscle={group.exercise.muscle[0] ?? null}
        top={top}
        topExerciseIds={used.map((e) => e.id)}
        onClose={onClose}
        onSelect={(exercise) => onPick(byId.get(exercise.id)!)}
        onCreate={setCreateName}
        footer={
          <p className="flex items-center gap-2 border-t border-neutral-100 px-4 pt-3 pb-4 text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Pour cette séance seulement. Tes résultats sur {baseName} ne sont pas modifiés.
          </p>
        }
      />
    </>
  );
}

// Création allégée d'une variante : nom + muscles (repris de l'exercice prévu). Aucun aller-retour
// serveur ici — l'exercice est créé localement puis synchronisé (voir switchExercise dans
// session-engine.ts), donc ça marche aussi sans réseau en salle.
function VariantCreateSheet({
  initialName,
  baseName,
  initialMuscles,
  targetSets,
  onClose,
  onCreate,
}: {
  initialName: string;
  baseName: string;
  initialMuscles: string[];
  targetSets: number;
  onClose: () => void;
  onCreate: (exercise: LibraryExercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState(initialMuscles);
  const canCreate = name.trim().length > 0 && name.trim().length <= 80 && muscle.length > 0;

  function create() {
    if (!canCreate) return;
    onCreate({ id: crypto.randomUUID(), name: name.trim(), muscle, targetSets, description: null });
  }

  return (
    <BottomSheet
      title="Nouvel exercice"
      closeIcon={ChevronLeft}
      closeLabel="Retour"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={create}
            disabled={!canCreate}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Créer et utiliser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Annuler
          </button>
        </div>
      }
    >
      <p className="mb-5 flex items-center gap-2.5 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent-deep">
        <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Remplacera <span className="font-semibold">{baseName}</span> pour cette séance
        </span>
      </p>
      <div className="space-y-6">
        <div>
          <label htmlFor="variant-name" className="mb-3 block text-base font-semibold text-neutral-900">
            Nom
          </label>
          <Input
            id="variant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : Hack squat pendulaire"
            maxLength={80}
          />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <label htmlFor="variant-muscle" className="text-base font-semibold text-neutral-900">
              Muscles ciblés
            </label>
            <span className="text-xs text-neutral-500">Repris de {baseName}</span>
          </div>
          <MuscleGroupPicker id="variant-muscle" name="muscle" value={muscle} onChange={setMuscle} />
        </div>
        <dl className="space-y-2 rounded-xl bg-neutral-100 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-600">Séries</dt>
            <dd className="font-medium">
              {targetSets > 0 ? `${targetSets}, comme ${baseName}` : `Comme ${baseName}`}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-600">Note</dt>
            <dd className="font-medium">À ajouter plus tard</dd>
          </div>
        </dl>
      </div>
    </BottomSheet>
  );
}
