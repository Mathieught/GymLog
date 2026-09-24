import { prisma } from "@/lib/prisma";
import { SESSION_AUTO_CLOSE_MS } from "@/lib/constants";

// Détermine si une séance doit être considérée comme terminée : fermeture automatique après
// `SESSION_AUTO_CLOSE_MS` sans la moindre modification (abandon), en plus de la fermeture manuelle
// ou depuis la popup de fin de séance. Basée sur `lastActivityAt` (mise à jour par chaque mutation,
// voir session-mutations.ts), pas `startedAt` : une séance activement suivie depuis plus longtemps
// que ce délai ne doit pas être coupée en plein milieu. Une fois terminée (peu importe la raison),
// la séance passe aussitôt en lecture seule — elle n'apparaît et ne se modifie que depuis
// l'historique en consultation. Calculée à la volée à chaque chargement, faute de tâche planifiée
// côté serveur.
export async function resolveSessionCompletion(session: {
  id: string;
  lastActivityAt: Date;
  completedAt: Date | null;
}): Promise<{ completedAt: Date | null; isReadOnly: boolean }> {
  let completedAt = session.completedAt;

  if (!completedAt && Date.now() - session.lastActivityAt.getTime() >= SESSION_AUTO_CLOSE_MS) {
    completedAt = new Date(session.lastActivityAt.getTime() + SESSION_AUTO_CLOSE_MS);
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { completedAt },
    });
  }

  return { completedAt, isReadOnly: completedAt !== null };
}

// Même règle que resolveSessionCompletion, mais pour toutes les séances de l'utilisateur d'un coup :
// appelée avant de lister l'historique, sinon une séance abandonnée n'y apparaîtrait qu'après avoir
// ouvert sa propre page (seul endroit qui la clôturait jusqu'ici). Une séance abandonnée sans
// aucune série validée n'a jamais vraiment existé : supprimée plutôt que rangée, vide, dans l'historique.
export async function closeStaleSessions(userId: string) {
  const seconds = SESSION_AUTO_CLOSE_MS / 1000;
  await prisma.workoutSession.deleteMany({
    where: {
      userId,
      completedAt: null,
      lastActivityAt: { lt: new Date(Date.now() - SESSION_AUTO_CLOSE_MS) },
      sets: { none: { completed: true } },
    },
  });
  await prisma.$executeRaw`
    UPDATE "WorkoutSession"
    SET "completedAt" = "lastActivityAt" + make_interval(secs => ${seconds})
    WHERE "userId" = ${userId}
      AND "completedAt" IS NULL
      AND "lastActivityAt" < now() - make_interval(secs => ${seconds})`;
}
