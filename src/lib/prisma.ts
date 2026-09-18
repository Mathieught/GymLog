import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// L'adaptateur ouvre un pool de connexions dès sa construction : ne le créer que si aucun client
// n'est déjà mis en cache sur `globalThis`, sinon chaque rechargement à chaud (HMR) en dev en
// construit un nouveau qui reste ouvert et jamais fermé (aucune référence pour l'appeler plus
// tard), épuisant peu à peu les connexions disponibles côté base sur une session de dev longue.
// `max` volontairement bas : en serverless (Vercel), chaque instance de fonction crée son propre
// pool — plusieurs requêtes concurrentes (ex. plusieurs pages prefetchées en même temps) font donc
// tourner plusieurs pools en parallèle. Avec le défaut de `pg` (10), quelques instances suffisent à
// épuiser les connexions du serveur Postgres géré par Prisma, qui en réserve une partie au rôle
// `prisma_migration` (voir l'erreur P2037 "Too many database connections").
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
