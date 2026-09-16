"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PageTitle } from "@/components/ui/page-title";
import { archiveWorkoutTemplate, reorderWorkoutTemplates } from "@/lib/actions/workout-templates";

type TemplateItem = {
  id: string;
  name: string;
  exerciseCount: number;
  scheduleLabel: string | null;
};

export function WorkoutList({ templates }: { templates: TemplateItem[] }) {
  const [items, setItems] = useState(templates);
  // Resynchronise l'état local sur les nouvelles données serveur (après suppression, ou après le
  // revalidatePath déclenché par reorderWorkoutTemplates) : ajustement pendant le rendu plutôt que
  // dans un effet (cf. doc React "Adjusting state when a prop changes"), `templates` ne
  // réinitialise sinon jamais `items` puisque useState ne garde que sa valeur initiale.
  const [syncedTemplates, setSyncedTemplates] = useState(templates);
  if (templates !== syncedTemplates) {
    setSyncedTemplates(templates);
    setItems(templates);
  }
  const [editing, setEditing] = useState(false);
  // dnd-kit attribue un id d'accessibilité auto-incrémenté à chaque useSortable, différent entre
  // le rendu serveur et la première passe client : on n'active DndContext qu'après l'hydratation
  // (même précaution que pour l'ordre des exercices dans WorkoutTemplateForm).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    // Persisté à part, après le setState : appeler l'action serveur (qui revalide la route)
    // depuis la callback de setItems mettait à jour le routeur pendant le rendu de WorkoutList.
    setItems(next);
    reorderWorkoutTemplates(next.map((item) => item.id)).catch(() => {});
  }

  return (
    <>
      <PageTitle
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? "Terminé" : "Modifier"}
              </Button>
            )}
            <ButtonLink href="/workouts/new" size="sm">
              + Nouvelle séance
            </ButtonLink>
          </div>
        }
      >
        Séances
      </PageTitle>

      {items.length === 0 ? (
        <p className="text-neutral-500">
          Aucune séance pour l&apos;instant. Créez votre premier modèle de séance pour commencer.
        </p>
      ) : editing && mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableWorkoutRow key={item.id} item={item} onDeleted={() => setEditing(false)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : editing ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <StaticWorkoutRow key={item.id} item={item} onDeleted={() => setEditing(false)} />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/workouts/${item.id}`}>
                <Card className="transition-colors hover:border-neutral-400">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-neutral-500">
                    {item.exerciseCount} exercice{item.exerciseCount > 1 ? "s" : ""}
                    {item.scheduleLabel ? ` · ${item.scheduleLabel}` : ""}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type RowProps = { item: TemplateItem; onDeleted: () => void };

function DeleteButton({ item, onDeleted }: RowProps) {
  return (
    <form action={archiveWorkoutTemplate.bind(null, item.id)} onSubmit={onDeleted}>
      <ConfirmSubmitButton
        type="submit"
        variant="ghost"
        size="sm"
        confirmMessage={`Supprimer "${item.name}" ? Elle n'apparaîtra plus dans vos listes, mais l'historique existant sera conservé.`}
        className="px-2 text-neutral-400 hover:text-red-600"
        aria-label={`Supprimer ${item.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </ConfirmSubmitButton>
    </form>
  );
}

function SortableWorkoutRow({ item, onDeleted }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
      className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3"
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
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-sm text-neutral-500">
          {item.exerciseCount} exercice{item.exerciseCount > 1 ? "s" : ""}
          {item.scheduleLabel ? ` · ${item.scheduleLabel}` : ""}
        </p>
      </div>
      <DeleteButton item={item} onDeleted={onDeleted} />
    </li>
  );
}

// Rendu avant hydratation (voir le commentaire sur `mounted` plus haut) : même contenu, sans
// useSortable puisque le drag-and-drop n'est de toute façon pas utilisable avant que React ait
// attaché ses gestionnaires d'évènements côté client.
function StaticWorkoutRow({ item, onDeleted }: RowProps) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
      <span className="text-neutral-300" aria-hidden="true">
        <GripVertical className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-sm text-neutral-500">
          {item.exerciseCount} exercice{item.exerciseCount > 1 ? "s" : ""}
          {item.scheduleLabel ? ` · ${item.scheduleLabel}` : ""}
        </p>
      </div>
      <DeleteButton item={item} onDeleted={onDeleted} />
    </li>
  );
}
