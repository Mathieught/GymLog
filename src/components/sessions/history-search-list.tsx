"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";

type HistoryGroup = {
  key: string;
  label: string;
  sessions: { id: string; name: string; details: string }[];
};

// Recherche par nom de séance au-dessus des semaines déjà regroupées côté serveur (voir
// src/app/history/page.tsx) : même barre que ExerciseSearchList.
export function HistorySearchList({ groups }: { groups: HistoryGroup[] }) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        sessions: group.sessions.filter((session) =>
          session.name.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.sessions.length > 0);
  }, [groups, query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une séance..."
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-accent-deep focus:ring-1 focus:ring-accent-deep"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune séance trouvée.</p>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">{group.label}</h2>
            <ul className="space-y-2">
              {group.sessions.map((session) => (
                <li key={session.id}>
                  <Link href={`/sessions/${session.id}`}>
                    <Card className="transition-colors hover:border-neutral-400">
                      <p className="font-medium">{session.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">{session.details}</p>
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
