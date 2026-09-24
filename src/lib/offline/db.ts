import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { SESSION_AUTO_CLOSE_MS } from "@/lib/constants";
import type { LocalHistoryEntry, LocalSession, OutboxOp, TemplateSnapshot } from "@/lib/offline/types";

interface GymLogDB extends DBSchema {
  sessions: { key: string; value: LocalSession };
  history: { key: string; value: LocalHistoryEntry };
  templates: { key: string; value: TemplateSnapshot };
  outbox: { key: number; value: { seq?: number; id: string; createdAt: number; op: OutboxOp } };
  meta: { key: string; value: { key: string; value: unknown } };
}

let dbPromise: Promise<IDBPDatabase<GymLogDB>> | null = null;

// Une seule connexion partagée : IndexedDB n'existe que dans le navigateur, jamais appelé
// pendant le rendu serveur.
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GymLogDB>("gymlog-offline", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("sessions", { keyPath: "id" });
          db.createObjectStore("history", { keyPath: "exerciseId" });
          db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("templates", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getLocalSession(id: string) {
  return (await getDb()).get("sessions", id);
}

// Une séance locale existe dès la première série renseignée (voir addSet/logSet dans
// session-engine.ts), avant même toute synchronisation serveur — donc avant qu'aucune page rendue
// côté serveur (aperçu du programme, /sessions/[id]) ne puisse la connaître. Utilisé pour reprendre
// une séance en cours quand on revient sur l'aperçu de son programme (retour arrière, app fermée
// puis rouverte) au lieu de repartir d'un état vide comme si rien n'avait été renseigné.
export async function getActiveLocalSessionForTemplate(workoutTemplateId: string) {
  const db = await getDb();
  const all = await db.getAll("sessions");
  const candidates = all.filter((s) => s.workoutTemplateId === workoutTemplateId && isOpen(s));
  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  return candidates[0];
}

// Pour le petit tag "En cours" sur la liste des séances (voir WorkoutList) : l'ensemble des
// programmes qui ont une séance locale non terminée, quel que soit l'état de synchronisation.
export async function getActiveLocalSessionTemplateIds(): Promise<Set<string>> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  // Sans série validée, une séance n'est qu'en sursis (annulée en quittant son programme, voir
  // discardEmptySessions) : pas de tag "En cours" sur la liste pour elle.
  return new Set(all.filter((s) => isOpen(s) && s.sets.some((set) => set.completed)).map((s) => s.workoutTemplateId));
}

// Séance locale ouverte : pas terminée et touchée il y a moins de SESSION_AUTO_CLOSE_MS — même
// fermeture par inactivité que côté serveur (resolveSessionCompletion), qu'IndexedDB n'appliquait
// jamais : une séance abandonnée restait "en cours" indéfiniment.
// ponytail: updatedAt sert de dernière modification ; une séance jamais vue sur cet appareil (créée
// ailleurs) part de l'heure d'ouverture faute de lastActivityAt local — le serveur, lui, a le vrai.
function isOpen(session: LocalSession) {
  return session.completedAt === null && Date.now() - session.updatedAt < SESSION_AUTO_CLOSE_MS;
}

export async function getLocalSessions() {
  return (await getDb()).getAll("sessions");
}

export async function putLocalSession(session: LocalSession) {
  await (await getDb()).put("sessions", session);
}

export async function deleteLocalSession(id: string) {
  await (await getDb()).delete("sessions", id);
}

export async function getLocalHistory(exerciseIds: string[]) {
  const db = await getDb();
  const entries = await Promise.all(exerciseIds.map((id) => db.get("history", id)));
  return new Map(entries.filter((e): e is LocalHistoryEntry => e !== undefined).map((e) => [e.exerciseId, e]));
}

export async function putLocalHistory(entry: LocalHistoryEntry) {
  await (await getDb()).put("history", entry);
}

export async function enqueueOp(op: OutboxOp) {
  const db = await getDb();
  await db.add("outbox", { id: crypto.randomUUID(), createdAt: Date.now(), op });
}

export async function getOutbox() {
  return (await getDb()).getAll("outbox");
}

export async function removeFromOutbox(seqs: number[]) {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  await Promise.all(seqs.map((seq) => tx.store.delete(seq)));
  await tx.done;
}

export async function getLocalTemplates() {
  return (await getDb()).getAll("templates");
}

export async function getLocalTemplate(id: string) {
  return (await getDb()).get("templates", id);
}

export async function replaceLocalTemplates(templates: TemplateSnapshot[]) {
  const db = await getDb();
  const tx = db.transaction("templates", "readwrite");
  await tx.store.clear();
  await Promise.all(templates.map((t) => tx.store.put(t)));
  await tx.done;
}

// Signal "s'est déjà connecté au moins une fois avec du réseau" : tant qu'aucune séance ni
// historique n'a jamais été mis en cache, l'appareil n'a pas encore de compte associé — se
// connecter est alors impossible hors ligne (voir src/app/~offline/page.tsx).
export async function hasAnyLocalData() {
  const db = await getDb();
  const [sessionsCount, historyCount, templatesCount] = await Promise.all([
    db.count("sessions"),
    db.count("history"),
    db.count("templates"),
  ]);
  return sessionsCount > 0 || historyCount > 0 || templatesCount > 0;
}

export async function setMeta(key: string, value: unknown) {
  await (await getDb()).put("meta", { key, value });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const entry = await (await getDb()).get("meta", key);
  return entry?.value as T | undefined;
}
