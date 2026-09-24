"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { APP_MODE_COOKIE, type AppMode } from "@/lib/app-mode";

const AppModeContext = createContext<{
  mode: AppMode;
  setMode: (mode: AppMode) => void;
} | null>(null);

// Mode lu côté serveur (cookie) pour le premier rendu, puis modifiable côté client : le cookie est
// écrit directement dans le navigateur (pas de Server Action), donc le changement est instantané et
// marche aussi hors ligne.
export function AppModeProvider({ initialMode, children }: { initialMode: AppMode; children: ReactNode }) {
  const [mode, setModeState] = useState(initialMode);

  function setMode(next: AppMode) {
    document.cookie = `${APP_MODE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setModeState(next);
  }

  return <AppModeContext.Provider value={{ mode, setMode }}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode doit être utilisé dans <AppModeProvider>");
  return ctx;
}

// Le "tag" des fonctionnalités avancées : tout ce qui est enveloppé ici n'apparaît qu'en mode Avancé.
// Utilisable depuis un Server Component comme depuis un Client Component.
export function AdvancedOnly({ children }: { children: ReactNode }) {
  return useAppMode().mode === "advanced" ? children : null;
}

const OPTIONS: { value: AppMode; label: string }[] = [
  { value: "basic", label: "Basique" },
  { value: "advanced", label: "Avancé" },
];

export function AppModeToggle() {
  const { mode, setMode } = useAppMode();

  // Même commande que Clair/Sombre (ThemePicker) : une pastille d'accent glisse derrière l'option active.
  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-full bg-neutral-200 p-[3px]">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-accent shadow-sm transition-transform duration-300 motion-reduce:transition-none",
          mode === "advanced" && "translate-x-full"
        )}
      />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMode(option.value)}
          aria-pressed={mode === option.value}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            mode === option.value ? "text-accent-contrast" : "text-neutral-500"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
