import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { SerwistProvider } from "@serwist/turbopack/react";
import { auth } from "@/lib/auth";
import { APP_MODE_COOKIE, parseAppMode } from "@/lib/app-mode";
import { appIconUrl, PAGE_BACKGROUND, parseTheme, serializeTheme, THEME_COOKIE, themeVariables } from "@/lib/theme";
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

// Manifest et icônes aux couleurs du thème choisi (mises à jour à chaud par ThemePicker).
export async function generateMetadata(): Promise<Metadata> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    title: "GymLog",
    description: "Suivi de musculation",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GymLog" },
    manifest: `/manifest.webmanifest?t=${serializeTheme(theme)}`,
    icons: { icon: appIconUrl(theme, 64), apple: appIconUrl(theme, 180) },
  };
}

// Teinte la barre d'état/barre d'adresse (Android, PWA installée) pour qu'elle se fonde dans le
// fond de l'app, sombre ou clair selon le thème choisi (mis à jour à chaud par ThemePicker).
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: PAGE_BACKGROUND[theme.mode] };
}

// Données personnelles toujours à jour : pas de pré-rendu statique pour cette app.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const cookieStore = await cookies();
  const appMode = parseAppMode(cookieStore.get(APP_MODE_COOKIE)?.value);
  // Thème posé dès le rendu serveur (mode + couleurs d'accent) : pas de flash de l'ancien thème.
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="fr"
      data-mode={theme.mode}
      style={themeVariables(theme) as React.CSSProperties}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
