"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { APP_MODE_COOKIE, ICON_STYLE_COOKIE, type AppMode, type IconStyle } from "@/lib/app-mode";

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

export function AppModeToggle() {
  const { mode, setMode } = useAppMode();
  return (
    <PillToggle
      options={[
        { value: "basic", label: "Basique" },
        { value: "advanced", label: "Avancé" },
      ]}
      value={mode}
      onChange={setMode}
    />
  );
}

// Réglage Icônes : cookie lu par le layout (data-icons sur <html>, rendu serveur sans flash), et
// attribut basculé à chaud ici — le CSS affiche la bonne version de chaque icône (voir MUSCLE_ICONS).
export function IconStyleToggle({ initialStyle }: { initialStyle: IconStyle }) {
  const [style, setStyle] = useState(initialStyle);
  return (
    <PillToggle
      options={[
        { value: "basic", label: "Basique" },
        { value: "simple", label: "Simplifié" },
      ]}
      value={style}
      onChange={(next) => {
        document.cookie = `${ICON_STYLE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.dataset.icons = next;
        setStyle(next);
      }}
    />
  );
}

// Même commande que Clair/Sombre (ThemePicker) : une pastille d'accent glisse derrière l'option active.
function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [{ value: T; label: string }, { value: T; label: string }];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-full bg-neutral-200 p-[3px]">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-accent shadow-sm transition-transform duration-300 motion-reduce:transition-none",
          value === options[1].value && "translate-x-full"
        )}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value ? "text-accent-contrast" : "text-neutral-500"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
