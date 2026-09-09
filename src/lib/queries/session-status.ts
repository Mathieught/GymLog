import { prisma } from "@/lib/prisma";
import { SESSION_AUTO_CLOSE_MS, SESSION_EDIT_GRACE_MS } from "@/lib/constants";

// Détermine si une séance doit être considérée comme terminée (fermeture automatique après
// `SESSION_AUTO_CLOSE_MS` d'inactivité, en plus de la fermeture manuelle/à la complétion des
// séries) et si la fenêtre de modification post-fermeture (`SESSION_EDIT_GRACE_MS`) est passée.
// Calculée à la volée à chaque chargement, faute de tâche planifiée côté serveur.
export async function resolveSessionCompletion(session: {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
}): Promise<{ completedAt: Date | null; isReadOnly: boolean }> {
  let completedAt = session.completedAt;

  if (!completedAt && Date.now() - session.startedAt.getTime() >= SESSION_AUTO_CLOSE_MS) {
    completedAt = new Date(session.startedAt.getTime() + SESSION_AUTO_CLOSE_MS);
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { completedAt },
    });
  }

  const isReadOnly = completedAt !== null && Date.now() - completedAt.getTime() >= SESSION_EDIT_GRACE_MS;

  return { completedAt, isReadOnly };
}
