"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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
import { GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { ExercisePickerSheet } from "@/components/workouts/exercise-picker-sheet";
import { ExerciseFormSheet } from "@/components/exercises/exercise-form-sheet";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { createExerciseInline } from "@/lib/actions/exercises";

type ExerciseOption = {
  id: string;
  name: string;
  muscle: string[];
  targetSets: number;
};

// useSyncExternalStore sans source externe : false au rendu serveur/hydratation, true ensuite.
const noopSubscribe = () => () => {};

type Row = {
  key: string;
  exerciseId: string;
};

export function WorkoutTemplateForm({
  formId: formIdProp,
  action,
  exerciseOptions,
  exerciseNamesById,
  defaultValues,
  onSuccess,
  onPendingChange,
}: {
  // Fourni par WorkoutFormSheet, qui rend le bouton de validation dans l'en-tête de la popup
  // (hors de l'arbre de ce composant) : l'attribut HTML form="..." l'associe malgré tout au
  // formulaire. Repli sur un id généré localement si utilisé sans popup.
  formId?: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  exerciseOptions: ExerciseOption[];
  exerciseNamesById: Record<string, string>;
  defaultValues?: {
    name: string;
    description: string | null;
    exercises: { exerciseId: string }[];
    scheduleDays: number[];
  };
  // Appelé après un enregistrement réussi (voir ActionState.nonce) : utilisé quand le formulaire
  // est ouvert dans une popup (WorkoutFormSheet) pour la refermer, puisque les actions
  // create/updateWorkoutTemplate ne font plus de redirect() (on reste sur la page derrière la
  // popup, qui se revalide déjà toute seule).
  onSuccess?: () => void;
  // Reflète `pending` (useActionState) au parent : le bouton de validation vit dans l'en-tête de
  // la popup, hors de ce composant, et doit pourtant se désactiver pendant l'enregistrement.
  onPendingChange?: (pending: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const handledNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.nonce !== undefined && state.nonce !== handledNonce.current) {
      handledNonce.current = state.nonce;
      onSuccess?.();
    }
  }, [state, onSuccess]);
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
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
  const [pickerOpen, setPickerOpen] = useState(false);
  // Nom pré-rempli de la popup de création, ouverte depuis la recherche (ExerciseSearch) ou le picker.
  const [createSheetName, setCreateSheetName] = useState<string | null>(null);
  const idPrefix = useId();
  // dnd-kit attribue un id d'accessibilité auto-incrémenté (non basé sur useId) à chaque
  // useSortable : il diffère toujours entre le rendu serveur et la première passe client. On
  // n'active le rendu avec DndContext qu'après l'hydratation pour éviter le mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const formId = formIdProp ?? `${idPrefix}-template-form`;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const addableExercises = options.filter((exercise) => !rows.some((row) => row.exerciseId === exercise.id));

  function addExercise(exercise: ExerciseOption) {
    setRows((current) => [...current, { key: crypto.randomUUID(), exerciseId: exercise.id }]);
    setPickerOpen(false);
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
  // La création ne demande que le nom (description et jours planifiés se règlent ensuite depuis
  // la page de modification, refonte Figma "Workout-Form-refonte-3") mais garde l'ajout
  // d'exercices, très utilisé dès la création.
  const isCreate = !defaultValues;

  const exercisesSection = (
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

      <ExerciseSearch
        exercises={addableExercises}
        allExercises={options}
        onSelect={addExercise}
        onCreate={setCreateSheetName}
        onBrowse={addableExercises.length > 0 ? () => setPickerOpen(true) : undefined}
      />

      {/* Avant le picker dans l'arbre : les deux se démontent ensemble après création, et le
          nettoyage de body.overflow doit se faire dans cet ordre pour ne pas rester à "hidden".
          Le portail étant monté après celui du picker, la popup s'affiche bien par-dessus. */}
      {createSheetName !== null && (
        <ExerciseFormSheet
          title="Nouvel exercice"
          action={createExerciseInline}
          defaultValues={{ name: createSheetName, muscle: [], targetSets: 3, description: null }}
          onClose={() => setCreateSheetName(null)}
          onSuccess={(created) => {
            if (!created.exercise) return;
            handleExerciseCreated(created.exercise);
            setCreateSheetName(null);
            setPickerOpen(false);
          }}
        />
      )}

      {pickerOpen && (
        <ExercisePickerSheet
          exercises={addableExercises}
          onClose={() => setPickerOpen(false)}
          onSelect={addExercise}
          onCreate={setCreateSheetName}
        />
      )}
    </div>
  );

  if (isCreate) {
    return (
      <div className="space-y-6">
        <form id={formId} action={formAction} className="space-y-5">
          <div>
            <Label htmlFor="name">Nom de la séance</Label>
            <Input id="name" name="name" placeholder="Push day" required />
            <FieldError messages={state.fieldErrors?.name} />
          </div>

          {/* description est requis (string) côté schéma de validation : sans champ visible sur cet
              écran, on force une valeur vide plutôt que de laisser FormData renvoyer null. */}
          <input type="hidden" name="description" value="" />
          <input type="hidden" name="exercisesJson" value={exercisesJson} />
        </form>

        {exercisesSection}

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    );
  }

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

        <input type="hidden" name="exercisesJson" value={exercisesJson} />
        {/* Jours planifiés retirés du formulaire (retour utilisateur, trop peu utilisé pour
            justifier sa place) : on reconduit la planification existante telle quelle plutôt que
            de la supprimer silencieusement au prochain enregistrement. */}
        {defaultValues?.scheduleDays.map((day) => (
          <input key={day} type="hidden" name="scheduleDays" value={day} />
        ))}
      </form>

      {exercisesSection}

      {/* Toujours associé au formulaire via l'attribut form malgré sa position hors du <form> :
          en bas, car secondaire par rapport au nom et aux exercices. */}
      <div>
        <Label htmlFor="description">Note / description (facultatif)</Label>
        <Textarea
          id="description"
          name="description"
          form={formId}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Ex : séance haut du corps, pousser..."
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </div>
  );
}

// Point d'entrée unique pour ajouter un exercice (proposition "Recherche unifiée") : on tape, on
// choisit un résultat, ou on crée l'exercice avec le texte saisi comme nom. Remplace les anciens
// boutons "Ajouter un exercice existant" / "Créer un nouvel exercice", peu visibles.
function ExerciseSearch({
  exercises,
  allExercises,
  onSelect,
  onCreate,
  onBrowse,
}: {
  // Exercices encore ajoutables (pas déjà dans la séance).
  exercises: ExerciseOption[];
  // Toute la bibliothèque : sert seulement à ne pas proposer de recréer un nom existant.
  allExercises: ExerciseOption[];
  onSelect: (exercise: ExerciseOption) => void;
  onCreate: (name: string) => void;
  // Ouvre le picker complet (filtre par muscle) pour parcourir sans rien taper.
  onBrowse?: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const name = query.trim();
  const normalized = name.toLowerCase();
  const results = normalized
    ? exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized)).slice(0, 5)
    : [];
  const canCreate =
    name !== "" && !allExercises.some((exercise) => exercise.name.toLowerCase() === normalized);

  function select(exercise: ExerciseOption) {
    onSelect(exercise);
    setQuery("");
  }

  function create() {
    onCreate(name);
    setQuery("");
  }

  return (
    <div className="mt-4">
      <Label htmlFor={inputId}>Ajouter un exercice</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-deep" />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (results[0]) select(results[0]);
            else if (canCreate) create();
          }}
          placeholder="Rechercher ou créer un exercice"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-neutral-300 bg-neutral-50 pl-12 pr-24 text-base outline-none transition-colors focus:border-accent"
        />
        {onBrowse && !name && (
          <button
            type="button"
            onClick={onBrowse}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-sm font-medium text-accent-deep hover:bg-accent-soft"
          >
            Parcourir
          </button>
        )}
      </div>

      {name && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
          {results.map((exercise) => (
            <li key={exercise.id} className="border-b border-neutral-200 last:border-b-0">
              <button
                type="button"
                onClick={() => select(exercise)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-neutral-200"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{exercise.name}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {[exercise.muscle.join(", "), `${exercise.targetSets} séries`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-3 bg-accent-soft px-3.5 py-3 text-left text-accent-deep transition-opacity hover:opacity-90"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">Créer « {name} »</span>
                  <span className="block text-xs text-neutral-600">Nouvel exercice, ajouté à la séance</span>
                </span>
              </button>
            </li>
          ) : (
            results.length === 0 && (
              <li className="px-3.5 py-3 text-sm text-neutral-500">Déjà dans la séance.</li>
            )
          )}
        </ul>
      )}
    </div>
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
        className="text-neutral-400 hover:text-danger"
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
        className="text-neutral-400 hover:text-danger"
        aria-label="Retirer l'exercice"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
