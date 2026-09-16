"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { WorkoutEditSheet } from "@/components/workouts/workout-edit-sheet";
import { WorkoutFormSheet } from "@/components/workouts/workout-form-sheet";
import { createWorkoutTemplate } from "@/lib/actions/workout-templates";

type TemplateItem = {
  id: string;
  name: string;
  exerciseCount: number;
  scheduleLabel: string | null;
};

type ExerciseOption = {
  id: string;
  name: string;
  muscle: string[];
  targetSets: number;
};

export function WorkoutList({
  templates,
  exerciseOptions,
  exerciseNamesById,
}: {
  templates: TemplateItem[];
  exerciseOptions: ExerciseOption[];
  exerciseNamesById: Record<string, string>;
}) {
  const [items, setItems] = useState(templates);
  // Resynchronise l'état local sur les nouvelles données serveur (après suppression/réorganisation
  // dans WorkoutEditSheet, qui revalident la route) : ajustement pendant le rendu plutôt que dans
  // un effet (cf. doc React "Adjusting state when a prop changes"), `templates` ne réinitialise
  // sinon jamais `items` puisque useState ne garde que sa valeur initiale.
  const [syncedTemplates, setSyncedTemplates] = useState(templates);
  if (templates !== syncedTemplates) {
    setSyncedTemplates(templates);
    setItems(templates);
  }
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  return (
    <>
      <PageTitle
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditSheetOpen(true)}>
                Modifier
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => setCreateSheetOpen(true)}>
              + Nouvelle séance
            </Button>
          </div>
        }
      >
        Séances
      </PageTitle>

      {items.length === 0 ? (
        <p className="text-neutral-500">
          Aucune séance pour l&apos;instant. Créez votre premier modèle de séance pour commencer.
        </p>
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

      {editSheetOpen && (
        <WorkoutEditSheet
          items={items}
          onReorder={setItems}
          onDeleted={(id) => setItems((current) => current.filter((item) => item.id !== id))}
          onClose={() => setEditSheetOpen(false)}
        />
      )}

      {createSheetOpen && (
        <WorkoutFormSheet
          title="Nouvelle séance"
          action={createWorkoutTemplate}
          exerciseOptions={exerciseOptions}
          exerciseNamesById={exerciseNamesById}
          onClose={() => setCreateSheetOpen(false)}
          onSuccess={() => setCreateSheetOpen(false)}
        />
      )}
    </>
  );
}
