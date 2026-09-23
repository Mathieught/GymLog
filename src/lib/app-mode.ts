export type AppMode = "basic" | "advanced";

export const APP_MODE_COOKIE = "app-mode";

// Tout ce qui n'est pas explicitement "advanced" retombe sur le mode Basique (défaut).
export function parseAppMode(value: string | undefined): AppMode {
  return value === "advanced" ? "advanced" : "basic";
}
