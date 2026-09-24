"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HistoryGroup = {
  key: string;
  label: string;
  sessions: {
    id: string;
    name: string;
    day: string;
    weekday: string;
    recent: boolean;
    exerciseCount: number;
  }[];
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
                    {/* Colonne date à gauche (numéro + jour) séparée par un filet : le numéro passe en
                        accent sur les 7 derniers jours, comme "Dernière séance" sur la page Séances. */}
                    <Card className="flex items-center gap-3.5 py-3 pl-3 pr-4 transition-colors hover:border-neutral-400">
                      <div className="grid w-[52px] shrink-0 justify-items-center gap-[3px] border-r border-neutral-200 pr-3">
                        <span
                          className={cn(
                            "font-mono text-[22px] font-semibold leading-none tabular-nums",
                            session.recent ? "text-accent" : "text-neutral-900"
                          )}
                        >
                          {session.day}
                        </span>
                        <span className="font-mono text-[9.5px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-500">
                          {session.weekday}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{session.name}</p>
                        <p className="text-sm text-neutral-500">
                          {session.exerciseCount} exercice{session.exerciseCount > 1 ? "s" : ""}
                        </p>
                      </div>
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
