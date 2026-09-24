import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { SerwistProvider } from "@serwist/turbopack/react";
import { auth } from "@/lib/auth";
import { APP_MODE_COOKIE, parseAppMode } from "@/lib/app-mode";
import { AppModeProvider } from "@/components/app-mode";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NavVisibilityProvider } from "@/components/nav/nav-visibility";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { SplashScreen } from "@/components/splash-screen";
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
  const appMode = parseAppMode((await cookies()).get(APP_MODE_COOKIE)?.value);

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900">
        <SplashScreen />
        <SerwistProvider swUrl="/serwist/sw.js">
          <OfflineSyncManager isAuthenticated={!!session?.user} />
          <TimeZoneSync />
          <AppModeProvider initialMode={appMode}>
            <NavVisibilityProvider>
              <main className="pb-24">{children}</main>
              <BottomNav />
            </NavVisibilityProvider>
          </AppModeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
