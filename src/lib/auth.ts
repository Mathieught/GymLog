import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      // Le compte de test existant a été rattaché à l'email Google par avance : sans ce flag,
      // Auth.js refuse de lier un compte OAuth à un utilisateur existant avec le même email
      // (protection anti-prise de contrôle de compte). Sûr ici : app mono-utilisateur, email
      // Google déjà vérifié par Google lui-même.
      allowDangerousEmailAccountLinking: true,
    }),
    // Contournement réservé au développement local : permet de tester l'app sans passer par le
    // flux OAuth Google réel. Le tableau de providers exclut cette entrée en production, donc
    // l'endpoint n'existe même pas une fois déployé (pas une simple option cachée côté UI).
    ...(isDev
      ? [
          Credentials({
            id: "dev",
            name: "Dev (local uniquement)",
            credentials: {},
            async authorize() {
              return prisma.user.upsert({
                where: { email: "dev@localhost" },
                update: {},
                create: { email: "dev@localhost", name: "Dev" },
              });
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
