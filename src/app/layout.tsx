import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/nav/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymLog",
  description: "Suivi de musculation",
};

// Données personnelles toujours à jour : pas de pré-rendu statique pour cette app.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900">
        <main className="pb-24">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
