"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Play } from "lucide-react";
import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Container } from "@/components/ui/container";
import { Button, ButtonLink } from "@/components/ui/button";
import { finishLocalSession } from "@/lib/offline/session-engine";
import type { LocalSession } from "@/lib/offline/types";
import { ExerciseMuscleIcon } from "@/components/exercises/muscle-group-picker";
import { SessionTimer } from "@/components/sessions/session-timer";
import { getActiveLocalSessionForTemplate, getLocalHistory } from "@/lib/offline/db";
import { localSessionToGroups } from "@/lib/offline/local-seed";
import { buildSessionRows } from "@/lib/session-rows";
import { cn, formatExerciseTarget } from "@/lib/utils";

type ExerciseItem = {
  id: string;
  exerciseId: string;
  name: string;
  muscles: string[];
  targetSets: number;
  targetMinutes: number | null;
};

type Progress = { done: number; total: number };

// Corps de la page programme : titre, liste des exercices et bouton du bas. Côté client parce que
// la séance en cours vit dans IndexedDB (voir session-engine.ts), jamais connue du rendu serveur :
// une fois lue, chaque exercice commencé ou fait affiche une barre à un segment par série, et le
// bouton devient "Reprendre" sur le premier exercice pas encore terminé.
export function WorkoutProgramBody({
  headerRight,
  templateId,
  name,
  meta,
  description,
  exercises,
  emptyState,
}: {
  headerRight: ReactNode;
  templateId: string;
  name: string;
  meta: string;
  description: string | null;
  exercises: ExerciseItem[];
  // Affiché à la place de la liste et du bouton quand le programme n'a aucun exercice.
  emptyState: ReactNode;
}) {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [hasValidatedSet, setHasValidatedSet] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [session, setSession] = useState<LocalSession | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getActiveLocalSessionForTemplate(templateId);
      if (!local) return;
      const groups = localSessionToGroups(local);
      const historyMap = await getLocalHistory(groups.flatMap((g) => [g.exerciseId, ...(g.variantId ? [g.variantId] : [])]));
      const history = Object.fromEntries([...historyMap].map(([id, entry]) => [id, entry.performances]));
      if (cancelled) return;
      // Même calcul que le rail de séance (buildSessionRows(..., 0)) : le total compte aussi les
      // séries encore seulement suggérées par l'historique/l'objectif.
      const next: Record<string, Progress> = {};
      for (const group of groups) {
        const rows = buildSessionRows(group, history, 0);
        next[group.exerciseId] = {
          done: rows.filter((row) => row.current?.completed).length,
          total: rows.length,
        };
      }
      setSession(local);
      setStartedAt(local.startedAt);
      setProgress(next);
      setHasValidatedSet(local.sets.some((set) => set.completed));
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const stateOf = (exerciseId: string) => {
    const p = progress[exerciseId];
    if (!p || p.done === 0) return "todo" as const;
    return p.done >= p.total ? ("done" as const) : ("progress" as const);
  };
  const resumeExercise = startedAt ? exercises.find((e) => stateOf(e.exerciseId) !== "done") : undefined;
  const resumeProgress = resumeExercise && progress[resumeExercise.exerciseId];
  // Pas de séance en cours : "Commencer la séance" la crée tout de suite (chrono lancé, annulée si
  // on quitte le programme sans valider de série — voir discardEmptySessions). Toucher un exercice,
  // lui, n'y touche pas : la séance ne démarre qu'à la première série.
  const startParam = startedAt ? "" : "&start=1";

  // Revenir aux séances annule une séance démarrée sans série validée (voir discardEmptySessions) :
  // on prévient d'abord, via le bouton "‹ Séances" comme via le retour du navigateur/téléphone.
  const guardLeave = !!startedAt && !hasValidatedSet;

  function handleBack(event: React.MouseEvent) {
    if (!guardLeave) return;
    event.preventDefault();
    setPendingLeave(true);
  }

  // Retour du navigateur ou geste retour Android : impossible à annuler tel quel, donc une entrée
  // d'historique en double (même URL) absorbe le retour, puis on la remet et on affiche la popup.
  // Marquée pour ne pas en empiler une de plus à chaque passage sur la page.
  useEffect(() => {
    if (!guardLeave) return;
    const pushGuard = () =>
      window.history.pushState({ ...window.history.state, gymlogGuard: true }, "", window.location.href);
    if (!window.history.state?.gymlogGuard) pushGuard();
    function onPopState() {
      pushGuard();
      setPendingLeave(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [guardLeave]);

  return (
    <>
      <PageHeader
        backHref="/workouts"
        onBack={handleBack}
        right={
          <>
            {headerRight}
            {/* Séance en cours : on peut la clore d'ici, sans rouvrir le suivi (même bouton que lui). */}
            {session && (
              <Button type="button" variant="secondary" size="sm" className="border-0" onClick={() => setPendingFinish(true)}>
                Terminer
              </Button>
            )}
          </>
        }
      />
      <Container className="pt-2">
        {/* Niveau nommé explicitement ("Programme") : la page de suivi, elle, affiche l'exercice en
          titre et l'état de la séance en surtitre — les deux pages ne se ressemblent plus. */}
        <p className="font-mono text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Programme</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{name}</h1>
          {startedAt && <SessionTimer startedAt={startedAt} />}
        </div>
        <p className="mt-1 font-mono text-[13px] text-neutral-500">{meta}</p>
        {description && <p className="mt-3 text-sm text-neutral-600">{description}</p>}

        {exercises.length === 0 ? (
          <div className="mt-4">{emptyState}</div>
        ) : (
          <>
            <p className="mt-4 mb-2 px-1 font-mono text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              Exercices
            </p>
            {/* pb : place pour le bouton fixé en bas (la nav du bas est masquée ici). */}
            <ul className="space-y-2 pb-32">
              {exercises.map((exercise, index) => {
                const state = stateOf(exercise.exerciseId);
                const p = progress[exercise.exerciseId];
                return (
                  <li key={exercise.id}>
                    <Link href={`/workouts/${templateId}/session?exercise=${exercise.exerciseId}`}>
                      <Card
                        className={cn(
                          "py-3 pl-3 transition-colors hover:border-neutral-400",
                          state === "done" && "bg-neutral-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muscle-tile",
                              state === "done" && "opacity-60"
                            )}
                          >
                            <ExerciseMuscleIcon muscles={exercise.muscles} className="h-[30px] w-[30px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate font-medium", state === "done" && "text-neutral-500")}>
                              {exercise.name}
                            </p>
                            <p className="truncate text-[13px] text-neutral-500">
                              {formatExerciseTarget({ muscle: exercise.muscles, targetSets: exercise.targetSets || null, targetMinutes: exercise.targetMinutes })}
                              {exercise.muscles.length > 0 && ` · ${exercise.muscles.join(", ")}`}
                            </p>
                          </div>
                          {state === "done" ? (
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-deep"
                              aria-label="Terminé"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          ) : state === "progress" ? (
                            <span className="shrink-0 font-mono text-[11px] font-semibold tracking-wider text-accent-deep uppercase">
                              En cours
                            </span>
                          ) : (
                            <>
                              <span className="shrink-0 font-mono text-xs text-neutral-400">
                                {index + 1}/{exercises.length}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                            </>
                          )}
                        </div>
                        {state !== "todo" && p && (
                          // Un segment par série, aligné sur le texte (tuile 40px + écart 12px).
                          <div
                            className="mt-2 flex gap-[3px] pr-4 pl-[52px]"
                            aria-label={`${p.done} séries sur ${p.total}`}
                          >
                            {Array.from({ length: p.total }, (_, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "h-[3px] flex-1 rounded-full",
                                  i < p.done ? "bg-accent" : "bg-neutral-200"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div
              className="fixed inset-x-0 bottom-0 z-10 bg-neutral-50 px-4 pt-3"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                <ButtonLink
                  href={`/workouts/${templateId}/session?exercise=${(resumeExercise ?? exercises[0]).exerciseId}${startParam}`}
                  size="lg"
                  className="w-full rounded-2xl font-semibold"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span className="truncate">
                    {resumeExercise
                      ? `Reprendre · ${resumeExercise.name}`
                      : startedAt
                        ? "Revoir la séance"
                        : "Commencer la séance"}
                  </span>
                </ButtonLink>
                <p className="text-center text-xs text-neutral-500">
                  {resumeProgress && resumeProgress.total > 0
                    ? `série ${Math.min(resumeProgress.done + 1, resumeProgress.total)} sur ${resumeProgress.total}`
                    : "ou touche un exercice pour commencer par lui"}
                </p>
              </div>
            </div>
          </>
        )}
      </Container>

      {pendingLeave && (
        <ConfirmDialog
          message="Aucune série n'est encore validée. Si tu quittes maintenant, la séance sera annulée. Reste pour valider au moins une série et la garder."
          confirmLabel="Quitter la séance"
          cancelLabel="Rester"
          onConfirm={() => router.push("/workouts")}
          onCancel={() => setPendingLeave(false)}
        />
      )}

      {pendingFinish && session && (
        <ConfirmDialog
          message={
            hasValidatedSet
              ? "Terminer la séance ? Vous ne pourrez plus modifier les séries après."
              : "Aucune série n'est validée : la séance sera annulée."
          }
          confirmLabel={hasValidatedSet ? "Terminer" : "Annuler la séance"}
          onConfirm={async () => {
            setPendingFinish(false);
            await finishLocalSession(session);
            router.push(hasValidatedSet ? "/history" : "/workouts");
          }}
          onCancel={() => setPendingFinish(false)}
        />
      )}
    </>
  );
}
