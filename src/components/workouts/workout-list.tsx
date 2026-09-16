"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { WorkoutEditSheet } from "@/components/workouts/workout-edit-sheet";

type TemplateItem = {
  id: string;
  name: string;
  exerciseCount: number;
  scheduleLabel: string | null;
};

export function WorkoutList({ templates }: { templates: TemplateItem[] }) {
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
    </>
  );
}
