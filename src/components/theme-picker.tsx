"use client";

import { useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  appIconUrl,
  contrast,
  PAGE_BACKGROUND,
  serializeTheme,
  THEME_COOKIE,
  THEME_FAMILIES,
  themeVariables,
  type Theme,
  type ThemeMode,
} from "@/lib/theme";

const MODES: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
];

// Applique un thème à la page déjà affichée (mêmes variables que le layout au rendu serveur) et le
// garde dans le cookie pour les prochains lancements.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.mode = theme.mode;
  for (const [name, value] of Object.entries(themeVariables(theme))) root.style.setProperty(name, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", PAGE_BACKGROUND[theme.mode]);
  document.querySelector('link[rel="icon"]')?.setAttribute("href", appIconUrl(theme, 64));
  document.querySelector('link[rel="manifest"]')?.setAttribute("href", `/manifest.webmanifest?t=${serializeTheme(theme)}`);
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute("href", appIconUrl(theme, 180));
  document.cookie = `${THEME_COOKIE}=${serializeTheme(theme)}; path=/; max-age=31536000; samesite=lax`;
}

// Thème lu côté serveur (cookie) pour le premier rendu, puis modifiable ici : appliqué tout de suite,
// sans rechargement — même principe que le mode Basique/Avancé, donc marche aussi hors ligne.
export function ThemePicker({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);

  function apply(next: Theme) {
    applyTheme(next);
    setTheme(next);
  }

  const current = THEME_FAMILIES.flatMap((family) =>
    family.themes.map((t) => ({ ...t, label: family.name === t.name ? t.name : `${family.name} ${t.name}` }))
  ).find((t) => t.id === theme.id);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">Affichage</p>
        {/* Deux libellés écrits, une pastille d'accent glisse derrière le mode actif. */}
        <div className="relative grid grid-cols-2 rounded-full bg-neutral-200 p-[3px]">
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-accent shadow-sm transition-transform duration-300 motion-reduce:transition-none",
              theme.mode === "dark" && "translate-x-full"
            )}
          />
          {MODES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => apply({ ...theme, mode: value })}
              aria-pressed={theme.mode === value}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                theme.mode === value ? "text-accent-contrast" : "text-neutral-500"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-neutral-200" />

      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">Couleur</p>
        <p className="text-sm text-neutral-500">{current?.label}</p>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-2.5">
        {THEME_FAMILIES.map((family) => (
          <div key={family.name} className="flex gap-1.5">
            {family.themes.map((t) => {
              const selected = t.id === theme.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => apply({ ...theme, id: t.id })}
                  aria-pressed={selected}
                  aria-label={family.name === t.name ? t.name : `${family.name} ${t.name}`}
                  title={t.name}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    selected && "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
                  )}
                  style={{ backgroundColor: t.color }}
                >
                  {selected && (
                    <Check
                      className="h-4 w-4"
                      strokeWidth={3}
                      color={contrast(t.color, "#10100c") >= contrast(t.color, "#ffffff") ? "#10100c" : "#ffffff"}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
