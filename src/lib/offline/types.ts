import type { PreviousPerformance } from "@/lib/queries/exercise-history";

export type LocalSet = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  exerciseOrder: number;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
  note: string | null;
};

export type LocalExercise = { name: string; muscle: string[]; targetSets: number };

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
  | { type: "ensureSession"; sessionId: string; workoutTemplateId: string; name: string }
  | {
      type: "addSet";
      setId: string;
      sessionId: string;
      exerciseId: string;
      exerciseOrder: number;
      setNumber: number;
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
  | { type: "completeSession"; sessionId: string };

export type OutboxEntry = { id: string; createdAt: number; op: OutboxOp };
