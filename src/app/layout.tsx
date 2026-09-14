import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/nav/bottom-nav";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymLog",
  description: "Suivi de musculation",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GymLog" },
  icons: { apple: "/apple-touch-icon.png" },
};

// Données personnelles toujours à jour : pas de pré-rendu statique pour cette app.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900">
        <SerwistProvider swUrl="/serwist/sw.js">
          <OfflineSyncManager isAuthenticated={!!session?.user} />
          <main className="pb-24">{children}</main>
          <BottomNav />
        </SerwistProvider>
      </body>
    </html>
  );
}
