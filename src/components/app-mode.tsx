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

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-neutral-200/70 p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMode(option.value)}
          aria-pressed={mode === option.value}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            mode === option.value
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:bg-white/60"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
