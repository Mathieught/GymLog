import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NavVisibilityProvider } from "@/components/nav/nav-visibility";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Réservée aux chiffres qui s'alignent en colonnes (poids, répétitions, chrono, dates) — voir
// font-mono ciblé dans SetRow/PreviousSetRow/SessionTimer/SetRecap, jamais le corps de texte.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymLog",
  description: "Suivi de musculation",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GymLog" },
  icons: { apple: "/apple-touch-icon.png" },
};

// Teinte la barre d'état/barre d'adresse (Android, PWA installée) pour qu'elle se fonde dans le
// fond sombre de l'app plutôt que de rester claire par défaut.
export const viewport: Viewport = {
  themeColor: "#131310",
};

// Données personnelles toujours à jour : pas de pré-rendu statique pour cette app.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900">
        <SerwistProvider swUrl="/serwist/sw.js">
          <OfflineSyncManager isAuthenticated={!!session?.user} />
          <NavVisibilityProvider>
            <main className="pb-24">{children}</main>
            <BottomNav />
          </NavVisibilityProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
