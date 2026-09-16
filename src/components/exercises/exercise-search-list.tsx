"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";

type ExerciseListItem = {
  id: string;
  name: string;
  targetSets: number;
};

type ExerciseGroup = {
  muscle: string;
  exercises: ExerciseListItem[];
};

// Recherche par nom au-dessus des groupes déjà filtrés par muscle côté serveur (voir
// src/app/exercises/page.tsx) : même barre que celle de la popup d'ajout d'exercice à une séance
// (ExercisePickerSheet), pour retrouver un exercice sans dérouler tous les groupes musculaires.
export function ExerciseSearchList({ groups }: { groups: ExerciseGroup[] }) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        exercises: group.exercises.filter((exercise) =>
          exercise.name.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.exercises.length > 0);
  }, [groups, query]);

  return (
    <div className="space-y-6">
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

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun exercice trouvé.</p>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.muscle}>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">{group.muscle}</h2>
            <ul className="space-y-2">
              {group.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <Link href={`/exercises/${exercise.id}`}>
                    <Card className="transition-colors hover:border-neutral-400">
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm text-neutral-500">
                        {exercise.targetSets} série{exercise.targetSets > 1 ? "s" : ""}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
