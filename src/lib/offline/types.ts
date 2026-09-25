import type { PreviousPerformance } from "@/lib/queries/exercise-history";

export type LocalSet = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  exerciseOrder: number;
  // Exercice du programme remplacé par une variante (voir WorkoutSet.substituteForId).
  substituteForId?: string | null;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

// description : note de l'exercice, facultative pour les instantanés antérieurs à son ajout.
// targetMinutes : durée visée par série d'un exercice cardio (voir Exercise.targetMinutes).
export type LocalExercise = {
  name: string;
  muscle: string[];
  targetSets: number;
  targetMinutes?: number | null;
  description?: string | null;
};

// Bibliothèque d'exercices, pour choisir une variante en séance (voir VariantPicker).
export type LibraryExercise = LocalExercise & { id: string };

export type LocalSession = {
  id: string;
  workoutTemplateId: string;
  name: string;
  completedAt: string | null;
  startedAt: string | null;
  // Instantané des exercices du programme au démarrage de la séance : source des groupes
  // affichés (même logique que session.workoutTemplate.exercises côté serveur).
  exercises: { exerciseId: string; exerciseOrder: number; exercise: LocalExercise }[];
  sets: LocalSet[];
  // Variante choisie par exercice du programme (id prévu → id variante) : garde le choix même avant
  // la première série faite dessus (ensuite, les séries le portent déjà).
  variants?: Record<string, string>;
  updatedAt: number;
};

export type LocalHistoryEntry = {
  exerciseId: string;
  performances: PreviousPerformance[];
  updatedAt: number;
};

// Instantané léger des programmes actifs, rafraîchi dès qu'il y a du réseau (voir
// src/lib/offline/snapshot.ts) : permet de démarrer une séance hors ligne à partir de N'IMPORTE
// quel programme, pas seulement ceux dont la page d'aperçu a déjà été visitée individuellement.
export type TemplateSnapshot = {
  id: string;
  name: string;
  exercises: { exerciseId: string; exerciseOrder: number; exercise: LocalExercise }[];
  updatedAt: number;
};

// Une opération par geste utilisateur, rejouée dans l'ordre par le serveur (voir
// src/lib/session-mutations.ts). Les ids (set, séance) sont générés côté client, donc chaque
// opération est idempotente à rejouer (upsert / delete "silencieux").
export type OutboxOp =
  // startedAt : instant du clic sur "Commencer la séance", pour que le chrono ne reparte pas de zéro
  // quand la première série validée crée vraiment la séance.
  | { type: "ensureSession"; sessionId: string; workoutTemplateId: string; name: string; startedAt?: string }
  | {
      type: "addSet";
      setId: string;
      sessionId: string;
      exerciseId: string;
      exerciseOrder: number;
      setNumber: number;
      substituteForId?: string | null;
    }
  | {
      type: "logSet";
      setId: string;
      sessionId: string;
      exerciseId: string;
      exerciseOrder: number;
      setNumber: number;
      actualWeight: number | null;
      actualReps: number | null;
      substituteForId?: string | null;
    }
  | {
      type: "updateSet";
      setId: string;
      actualWeight: number | null;
      actualReps: number | null;
      completed: boolean;
    }
  | { type: "removeSet"; setId: string; sessionId: string; exerciseId: string }
  | { type: "updateSetNote"; setId: string; note: string | null }
  // Note de l'exercice lui-même (pas de la séance) : modifiable depuis l'en-tête de la séance.
  | { type: "updateExerciseNote"; exerciseId: string; note: string | null }
  // Variante créée en pleine séance, hors ligne compris : id généré côté client, comme les séries.
  | { type: "createExercise"; exerciseId: string; name: string; muscle: string[]; targetSets: number | null }
  // Bascule les séries pas encore validées d'un exercice du programme vers une variante (retour à
  // l'exercice prévu quand exerciseId === slotExerciseId).
  | { type: "switchExercise"; sessionId: string; slotExerciseId: string; exerciseId: string }
  | { type: "completeSession"; sessionId: string }
  // Séance quittée sans aucune série validée : elle n'a jamais existé (voir discardSession).
  | { type: "discardSession"; sessionId: string };

export type OutboxEntry = { id: string; createdAt: number; op: OutboxOp };
