export type AppMode = "basic" | "advanced";

export const APP_MODE_COOKIE = "app-mode";

// Tout ce qui n'est pas explicitement "advanced" retombe sur le mode Basique (défaut).
export function parseAppMode(value: string | undefined): AppMode {
  return value === "advanced" ? "advanced" : "basic";
}

// Réglage Icônes : "basic" = silhouettes (défaut), "simple" = pictogrammes au trait.
export type IconStyle = "basic" | "simple";

export const ICON_STYLE_COOKIE = "icon-style";

export function parseIconStyle(value: string | undefined): IconStyle {
  return value === "simple" ? "simple" : "basic";
}
