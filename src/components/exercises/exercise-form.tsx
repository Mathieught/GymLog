"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Input, Textarea, FieldError } from "@/components/ui/field";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { SetCountPicker } from "@/components/exercises/set-count-picker";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { useAppMode } from "@/components/app-mode";
import { isCardio } from "@/lib/utils";
import { QUICK_MINUTES, QUICK_MINUTES_PER_SET } from "@/lib/constants";

// Formulaire nu (pas d'en-tête ni de conteneur de page, pas de bouton de validation) : toujours
// ouvert dans une popup (ExerciseFormSheet), qui fournit son propre en-tête/scroll et dont le
// bouton de validation (icône dans l'en-tête) cible ce formulaire via son id.
export function ExerciseForm<S extends ActionState>({
  formId,
  action,
  defaultValues,
  onSuccess,
  onPendingChange,
  setsOptional,
}: {
  formId?: string;
  action: (prevState: S, formData: FormData) => Promise<S>;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number | null;
    targetMinutes?: number | null;
    description: string | null;
  };
  // Appelé après un enregistrement réussi (voir ActionState.nonce) pour refermer la popup : les
  // actions create/updateExercise ne font plus de redirect() (on reste sur la page derrière la
  // popup, qui se revalide déjà toute seule). Reçoit l'état renvoyé par l'action (ex : l'exercice
  // créé par createExerciseInline).
  onSuccess?: (state: S) => void;
  // Reflète `pending` (useActionState) au parent : le bouton de validation vit dans l'en-tête de
  // la popup, hors de ce composant, et doit pourtant se désactiver pendant l'enregistrement.
  onPendingChange?: (pending: boolean) => void;
  // Nombre de séries facultatif (onglet Exercices) : rien de présélectionné à la création. Reste
  // obligatoire (3 par défaut) à la création à la volée depuis une séance.
  setsOptional?: boolean;
}) {
  const [state, formAction, pending] = useActionState<S, FormData>(action, initialActionState as Awaited<S>);
  const handledNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.nonce !== undefined && state.nonce !== handledNonce.current) {
      handledNonce.current = state.nonce;
      onSuccess?.(state);
    }
  }, [state, onSuccess]);
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  const [muscle, setMuscle] = useState<string[]>(defaultValues?.muscle ?? []);
  const [targetSets, setTargetSets] = useState<number | null>(
    defaultValues ? defaultValues.targetSets : setsOptional ? null : 3
  );
  const [targetMinutes, setTargetMinutes] = useState<number | null>(defaultValues?.targetMinutes ?? null);
  // Cardio : se règle en durée. Basique = un seul bloc (1 série d'office, l'étape Séries disparaît) ;
  // Avancé = séries × durée par série (fractionné).
  const cardio = isCardio(muscle);
  const advanced = useAppMode().mode === "advanced";
  const showSets = !cardio || advanced;
  const noteStep = cardio && advanced ? 5 : 4;

  // Ids préfixés : cette popup s'ouvre aussi par-dessus le formulaire de séance, qui a déjà ses
  // propres champs "name"/"description" (un label pointerait sinon vers le champ de derrière).
  const ids = useId();
  // Note repliée par défaut (facultative) sauf si l'exercice en a déjà une.
  const [noteOpen, setNoteOpen] = useState(Boolean(defaultValues?.description));

  return (
    <form id={formId} action={formAction}>
      <Step n={1} title="Nom" htmlFor={`${ids}-name`}>
        <Input
          id={`${ids}-name`}
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="Ex : Développé couché"
          required
        />
        <FieldError messages={state.fieldErrors?.name} />
      </Step>

      <Step
        n={2}
        title="Muscles ciblés"
        htmlFor={`${ids}-muscle`}
        aside={
          muscle.length === 0
            ? "Aucun"
            : `${muscle.length} sélectionné${muscle.length > 1 ? "s" : ""}`
        }
      >
        <MuscleGroupPicker id={`${ids}-muscle`} name="muscle" value={muscle} onChange={setMuscle} />
        <FieldError messages={state.fieldErrors?.muscle} />
      </Step>

      {showSets ? (
        <Step
          n={3}
          title="Séries"
          htmlFor={`${ids}-targetSets`}
          aside={targetSets === null ? "Facultatif" : `${targetSets} série${targetSets > 1 ? "s" : ""}`}
          last={!noteOpen && !cardio}
        >
          <SetCountPicker
            id={`${ids}-targetSets`}
            name="targetSets"
            value={targetSets}
            onChange={setTargetSets}
            optional={setsOptional}
          />
          <FieldError messages={state.fieldErrors?.targetSets} />
        </Step>
      ) : (
        // Cardio en Basique : un seul bloc de durée (voir ExercisePanel en séance).
        <input type="hidden" name="targetSets" value={1} />
      )}

      {cardio ? (
        <Step
          n={showSets ? 4 : 3}
          title={showSets ? "Durée par série" : "Durée"}
          htmlFor={`${ids}-targetMinutes`}
          aside={targetMinutes === null ? "Facultatif" : `${targetMinutes} min`}
          last={!noteOpen}
        >
          <SetCountPicker
            id={`${ids}-targetMinutes`}
            name="targetMinutes"
            value={targetMinutes}
            onChange={setTargetMinutes}
            optional={setsOptional}
            quickValues={showSets ? QUICK_MINUTES_PER_SET : QUICK_MINUTES}
            step={5}
            max={200}
            unit="minutes"
          />
          <FieldError messages={state.fieldErrors?.targetMinutes} />
        </Step>
      ) : (
        <input type="hidden" name="targetMinutes" value="" />
      )}

      {noteOpen ? (
        <Step n={noteStep} title="Note" htmlFor={`${ids}-description`} aside="Facultatif" last>
          <Textarea
            id={`${ids}-description`}
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Ex : buter légèrement les omoplates, prise large..."
          />
          <FieldError messages={state.fieldErrors?.description} />
        </Step>
      ) : (
        <>
          {/* description est une chaîne requise côté schéma : champ vide tant que la note est repliée. */}
          <input type="hidden" name="description" value="" />
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="flex w-full items-center gap-3 text-left text-neutral-600 hover:text-neutral-900"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-base font-medium">Ajouter une note</span>
            <span className="text-xs text-neutral-500">Facultatif</span>
          </button>
        </>
      )}

      {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}
    </form>
  );
}

// Étape de la frise verticale 1-2-3 : pastille numérotée à gauche, reliée à la suivante par un
// trait (sauf la dernière), titre + info courte à droite (ex : "2 sélectionnés").
function Step({
  n,
  title,
  htmlFor,
  aside,
  last,
  children,
}: {
  n: number;
  title: string;
  htmlFor: string;
  aside?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative pb-6 pl-11">
      <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-deep">
        {n}
      </span>
      {!last && <span className="absolute bottom-1.5 left-[13.5px] top-9 w-px bg-neutral-300" />}
      <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-base font-semibold text-neutral-900">
          {title}
        </label>
        {aside && <span className="text-xs text-neutral-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
