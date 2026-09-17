import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// L'adaptateur ouvre un pool de connexions dès sa construction : ne le créer que si aucun client
// n'est déjà mis en cache sur `globalThis`, sinon chaque rechargement à chaud (HMR) en dev en
// construit un nouveau qui reste ouvert et jamais fermé (aucune référence pour l'appeler plus
// tard), épuisant peu à peu les connexions disponibles côté base sur une session de dev longue.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
