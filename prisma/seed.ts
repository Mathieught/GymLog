import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log(`Utilisateur déjà présent (${existing.id}), rien à faire.`);
    return;
  }

  const user = await prisma.user.create({
    data: { name: "Mathieu" },
  });
  console.log(`Utilisateur créé : ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
