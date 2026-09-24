"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTheme, THEME_COOKIE, themeVariables } from "@/lib/theme";
import "./globals.css";

// Dernier recours : le layout racine lui-même a planté (ex. auth ou base injoignable au
// chargement), donc error.tsx ne peut pas s'afficher. Cette page remplace tout le document :
// ni nav, ni thème posé par le layout — on relit le cookie de thème ici, côté navigateur.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    const cookie = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`))?.[1];
    const theme = parseTheme(cookie);
    const root = document.documentElement;
    root.dataset.mode = theme.mode;
    for (const [name, value] of Object.entries(themeVariables(theme))) root.style.setProperty(name, value);
  }, []);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        <title>GymLog</title>
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold">L&apos;application n&apos;a pas pu démarrer</h1>
          <p className="max-w-sm text-neutral-500">
            Un problème est survenu au chargement. Tes séries déjà validées ne sont pas perdues.
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" onClick={() => retry()}>
              Réessayer
            </Button>
            {/* <a> plutôt que Link : rechargement complet, le routeur a pu planter avec le layout. */}
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-neutral-100 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Accueil
            </a>
          </div>
          {error.digest && <p className="font-mono text-xs text-neutral-400">Réf. {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
