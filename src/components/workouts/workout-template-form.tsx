"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/field";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { WEEKDAYS } from "@/lib/constants";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { createExerciseInline, type CreateExerciseInlineState } from "@/lib/actions/exercises";

type ExerciseOption = {
  id: string;
  name: string;
  muscle: string;
  targetWeight: number;
  targetReps: number;
};

type Row = {
  key: string;
  exerciseId: string;
};

export function WorkoutTemplateForm({
  action,
  exerciseOptions,
  exerciseNamesById,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  exerciseOptions: ExerciseOption[];
  exerciseNamesById: Record<string, string>;
  defaultValues?: {
    name: string;
    description: string | null;
    exercises: { exerciseId: string }[];
    scheduleDays: number[];
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [rows, setRows] = useState<Row[]>(
    () =>
      // Clé dérivée de l'exerciceId (stable et identique entre le rendu serveur et client) : les
      // lignes déjà présentes dans defaultValues ne peuvent pas utiliser crypto.randomUUID() ici,
      // qui produirait une valeur différente à chaque rendu et casserait l'hydratation React.
      defaultValues?.exercises.map((exercise) => ({
        key: exercise.exerciseId,
        ...exercise,
      })) ?? []
  );
  const [options, setOptions] = useState<ExerciseOption[]>(exerciseOptions);
  const [namesById, setNamesById] = useState<Record<string, string>>(exerciseNamesById);
  const [exerciseToAdd, setExerciseToAdd] = useState("");
  const idPrefix = useId();
  // dnd-kit attribue un id d'accessibilité auto-incrémenté (non basé sur useId) à chaque
  // useSortable : il diffère toujours entre le rendu serveur et la première passe client. On
  // n'active le rendu avec DndContext qu'après l'hydratation pour éviter le mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const formId = `${idPrefix}-template-form`;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const addableExercises = options.filter((exercise) => !rows.some((row) => row.exerciseId === exercise.id));

  function addExercise() {
    const exercise = options.find((option) => option.id === exerciseToAdd);
    if (!exercise) return;
    setRows((current) => [...current, { key: crypto.randomUUID(), exerciseId: exercise.id }]);
    setExerciseToAdd("");
  }

  function handleExerciseCreated(exercise: ExerciseOption) {
    setOptions((current) => [...current, exercise].sort((a, b) => a.name.localeCompare(b.name)));
    setNamesById((current) => ({ ...current, [exercise.id]: exercise.name }));
    setRows((current) => [...current, { key: crypto.randomUUID(), exerciseId: exercise.id }]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((current) => {
      const oldIndex = current.findIndex((row) => row.key === active.id);
      const newIndex = current.findIndex((row) => row.key === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  const exercisesJson = JSON.stringify(rows.map(({ exerciseId }) => ({ exerciseId })));

  return (
    <div className="space-y-6">
      <form id={formId} action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nom de la séance</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="Push day"
            required
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div>
          <Label htmlFor="description">Note / description (facultatif)</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Ex : séance haut du corps, pousser..."
          />
          <FieldError messages={state.fieldErrors?.description} />
        </div>

        <div>
          <Label>Jours planifiés (facultatif)</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm has-checked:border-neutral-900 has-checked:bg-neutral-900 has-checked:text-white"
              >
                <input
                  type="checkbox"
                  name="scheduleDays"
                  value={day.value}
                  defaultChecked={defaultValues?.scheduleDays.includes(day.value)}
                  className="sr-only"
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>

        <input type="hidden" name="exercisesJson" value={exercisesJson} />
      </form>

      <div>
        <Label>Exercices</Label>

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun exercice ajouté pour l&apos;instant.</p>
        ) : mounted ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((row) => row.key)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <ExerciseRow
                    key={row.key}
                    row={row}
                    exerciseName={namesById[row.exerciseId] ?? "Exercice"}
                    onRemove={removeRow}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <StaticExerciseRow
                key={row.key}
                row={row}
                exerciseName={namesById[row.exerciseId] ?? "Exercice"}
                onRemove={removeRow}
              />
            ))}
          </ul>
        )}
        <FieldError messages={state.fieldErrors?.exercises} />

        {addableExercises.length > 0 && (
          <div className="mt-3 flex gap-2">
            <Select
              value={exerciseToAdd}
              onChange={(event) => setExerciseToAdd(event.target.value)}
              className="flex-1"
            >
              <option value="">Ajouter un exercice existant...</option>
              {addableExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} · {exercise.muscle}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={addExercise} disabled={!exerciseToAdd}>
              Ajouter
            </Button>
          </div>
        )}

        <CreateExerciseInline onCreated={handleExerciseCreated} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" form={formId} disabled={pending} className="w-full">
        {pending ? "Enregistrement..." : submitLabel}
      </Button>
    </div>
  );
}

function CreateExerciseInline({ onCreated }: { onCreated: (exercise: ExerciseOption) => void }) {
  const [open, setOpen] = useState(false);
  const [muscle, setMuscle] = useState("");
  const [state, formAction, pending] = useActionState<CreateExerciseInlineState, FormData>(
    createExerciseInline,
    {}
  );
  const handledNonce = useRef<number | undefined>(undefined);
  const idPrefix = useId();

  useEffect(() => {
    if (state.exercise && state.nonce !== handledNonce.current) {
      handledNonce.current = state.nonce;
      onCreated(state.exercise);
      setOpen(false);
    }
  }, [state, onCreated]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
      >
        + Créer un nouvel exercice
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-3"
    >
      <div>
        <Label htmlFor={`${idPrefix}-name`}>Nom de l&apos;exercice</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          placeholder="Presse à cuisses"
          required
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-muscle`}>Muscle ciblé</Label>
        <MuscleGroupPicker id={`${idPrefix}-muscle`} name="muscle" value={muscle} onChange={setMuscle} />
        <FieldError messages={state.fieldErrors?.muscle} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`${idPrefix}-weight`}>Poids cible (kg)</Label>
          <Input
            id={`${idPrefix}-weight`}
            name="targetWeight"
            type="number"
            step="0.5"
            min="0"
            defaultValue={0}
            required
          />
          <FieldError messages={state.fieldErrors?.targetWeight} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-reps`}>Répétitions cibles</Label>
          <Input
            id={`${idPrefix}-reps`}
            name="targetReps"
            type="number"
            step="1"
            min="1"
            defaultValue={10}
            required
          />
          <FieldError messages={state.fieldErrors?.targetReps} />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Création..." : "Créer et ajouter à la séance"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

type RowProps = {
  row: Row;
  exerciseName: string;
  onRemove: (key: string) => void;
};

function ExerciseRow({ row, exerciseName, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none text-neutral-400 hover:text-neutral-600"
        aria-label="Réordonner"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <p className="flex-1 truncate text-sm font-medium">{exerciseName}</p>
      <button
        type="button"
        onClick={() => onRemove(row.key)}
        className="text-neutral-400 hover:text-red-600"
        aria-label="Retirer l'exercice"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

// Rendu avant hydratation (voir le commentaire sur `mounted` plus haut) : même contenu, sans
// passer par useSortable puisque le drag-and-drop n'est de toute façon pas utilisable avant que
// React ait attaché ses gestionnaires d'évènements côté client.
function StaticExerciseRow({ row, exerciseName, onRemove }: RowProps) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
      <span className="text-neutral-300" aria-hidden="true">
        <GripVertical className="h-5 w-5" />
      </span>
      <p className="flex-1 truncate text-sm font-medium">{exerciseName}</p>
      <button
        type="button"
        onClick={() => onRemove(row.key)}
        className="text-neutral-400 hover:text-red-600"
        aria-label="Retirer l'exercice"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
