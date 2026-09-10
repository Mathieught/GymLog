import { prisma } from "@/lib/prisma";
import { SESSION_AUTO_CLOSE_MS } from "@/lib/constants";

// Détermine si une séance doit être considérée comme terminée : fermeture automatique après
// `SESSION_AUTO_CLOSE_MS` d'inactivité (abandon), en plus de la fermeture manuelle ou depuis la
// popup de fin de séance. Une fois terminée (peu importe la raison), la séance passe aussitôt en
// lecture seule — elle n'apparaît et ne se modifie que depuis l'historique en consultation.
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

  return { completedAt, isReadOnly: completedAt !== null };
}
