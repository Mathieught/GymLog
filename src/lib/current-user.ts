import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Pas d'authentification en MVP : un seul utilisateur, seedé au démarrage (voir prisma/seed.ts).
export const getCurrentUserId = cache(async () => {
  const user = await prisma.user.findFirstOrThrow();
  return user.id;
});
