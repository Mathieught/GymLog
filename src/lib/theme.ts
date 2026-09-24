// Thèmes de l'app : un mode (sombre/clair) et une couleur d'accent. Source unique utilisée par le
// layout (rendu serveur, pas de flash au lancement) et par le sélecteur des Paramètres (changement
// instantané côté client). Les gris de chaque mode sont dans globals.css ([data-mode]) ; seules les
// 4 couleurs d'accent sont calculées ici, pour garantir un texte lisible dans chaque combinaison.

export type ThemeMode = "dark" | "light";

export const THEME_COOKIE = "theme";

export const THEME_FAMILIES = [
  { name: "Vert", themes: [{ id: "vert", name: "Vert", color: "#c9f22b" }] },
  {
    name: "Rose",
    themes: [
      { id: "rose-fuchsia", name: "Fuchsia", color: "#f53fd0" },
      { id: "rose-poudre", name: "Poudré", color: "#f4a3c0" },
    ],
  },
  {
    name: "Bleu",
    themes: [
      { id: "bleu-glacier", name: "Glacier", color: "#9ec5ff" },
      { id: "bleu-saphir", name: "Saphir", color: "#6179ff" },
    ],
  },
  {
    name: "Jaune",
    themes: [
      { id: "jaune-citron", name: "Citron", color: "#ffe03a" },
      { id: "jaune-pastel", name: "Pastel", color: "#fff08a" },
    ],
  },
  {
    // Rouges froids et profonds : ne pas les confondre avec le corail du bouton Supprimer (danger).
    name: "Rouge",
    themes: [
      { id: "rouge-grenat", name: "Grenat", color: "#b52a45" },
      { id: "rouge-pourpre", name: "Pourpre", color: "#a31f63" },
    ],
  },
] as const;

export type ThemeId = (typeof THEME_FAMILIES)[number]["themes"][number]["id"];

const THEMES = new Map<string, string>(
  THEME_FAMILIES.flatMap((family) => family.themes.map((theme) => [theme.id, theme.color] as const))
);

// Fond de page de chaque mode (= --n-50 dans globals.css) : contrastes et couleur de la barre d'état.
export const PAGE_BACKGROUND: Record<ThemeMode, string> = { dark: "#131310", light: "#f6f5f0" };
const DARK_TEXT = "#10100c";

export type Theme = { mode: ThemeMode; id: ThemeId };

// Cookie "mode.id" (ex. "dark.rose-fuchsia") ; toute valeur inconnue retombe sur sombre + vert.
export function parseTheme(value: string | undefined): Theme {
  const [mode, id] = (value ?? "").split(".");
  return {
    mode: mode === "light" ? "light" : "dark",
    id: id && THEMES.has(id) ? (id as ThemeId) : "vert",
  };
}

export const serializeTheme = (theme: Theme) => `${theme.mode}.${theme.id}`;

// ---------- Couleurs dérivées ----------
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) =>
  "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => {
  const target = channels(b);
  return toHex(channels(a).map((v, i) => v + (target[i] - v) * t));
};
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Variables CSS de la couleur d'accent pour un thème, posées sur <html> :
// - accent : aplats (encadré, boutons) ;
// - accent-contrast : texte sur ces aplats, sombre ou blanc selon le plus lisible ;
// - accent-deep : texte/icône d'accent sur le fond, éclairci (sombre) ou assombri (clair)
//   jusqu'à un contraste de 4,5:1 ;
// - accent-soft : fond de badge, accent très dilué dans le fond de page.
export function themeVariables({ mode, id }: Theme): Record<string, string> {
  const accent = THEMES.get(id) ?? "#c9f22b";
  const background = PAGE_BACKGROUND[mode];
  let deep = accent;
  for (let t = 0.05; contrast(deep, background) < 4.5 && t <= 1; t += 0.05) {
    deep = mix(accent, mode === "dark" ? "#ffffff" : "#000000", t);
  }
  return {
    "--accent": accent,
    "--accent-contrast": contrast(accent, DARK_TEXT) >= contrast(accent, "#ffffff") ? DARK_TEXT : "#ffffff",
    "--accent-deep": deep,
    "--accent-soft": mode === "dark" ? mix(accent, background, 0.82) : mix(accent, "#ffffff", 0.8),
  };
}
