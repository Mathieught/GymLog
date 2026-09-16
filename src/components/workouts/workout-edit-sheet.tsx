"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { GripVertical, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { archiveWorkoutTemplate, reorderWorkoutTemplates } from "@/lib/actions/workout-templates";

type TemplateItem = {
  id: string;
  name: string;
  exerciseCount: number;
  scheduleLabel: string | null;
};

// Ouvert depuis le bouton "Modifier" de la liste des séances (voir WorkoutList) : même famille que
// ExercisePickerSheet (bottom sheet plein écran, portail sur body). Un écran dédié plutôt qu'un
// simple état affiché en place sur la liste normale, pour que le mode réorganisation/suppression
// soit sans ambiguïté. Comme il ne se monte jamais côté serveur (seulement après un clic), pas
// besoin du garde-fou d'hydratation utilisé ailleurs pour dnd-kit (voir WorkoutTemplateForm).
export function WorkoutEditSheet({
  items,
  onReorder,
  onDeleted,
  onClose,
}: {
  items: TemplateItem[];
  onReorder: (items: TemplateItem[]) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<TemplateItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    onReorder(next);
    reorderWorkoutTemplates(next.map((item) => item.id)).catch(() => {});
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    onDeleted(pendingDelete.id);
    archiveWorkoutTemplate(pendingDelete.id).catch(() => {});
    setPendingDelete(null);
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[95vh] flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-500">Modifier les séances</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">Aucune séance.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <WorkoutRow key={item.id} item={item} onRequestDelete={setPendingDelete} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          message={`Supprimer "${pendingDelete.name}" ? Elle n'apparaîtra plus dans vos listes, mais l'historique existant sera conservé.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>,
    document.body
  );
}

function WorkoutRow({
  item,
  onRequestDelete,
}: {
  item: TemplateItem;
  onRequestDelete: (item: TemplateItem) => void;
}) {
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
      <button
        type="button"
        onClick={() => onRequestDelete(item)}
        className="p-2 text-neutral-400 hover:text-red-600"
        aria-label={`Supprimer ${item.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
