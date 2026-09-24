import type { MetadataRoute } from "next";
import { appIconUrl, PAGE_BACKGROUND, parseTheme } from "@/lib/theme";

// Manifest aux couleurs du thème (?t=dark.vert, posé par le layout et ThemePicker) : le navigateur
// le télécharge sans cookies, donc le thème passe par l'URL. `id` fixe pour qu'Android reconnaisse
// la même app quelle que soit l'URL, et mette à jour son icône au lieu d'en voir une nouvelle.
export function GET(request: Request) {
  const theme = parseTheme(new URL(request.url).searchParams.get("t") ?? undefined);
  const manifest: MetadataRoute.Manifest = {
    id: "/",
    name: "GymLog",
    short_name: "GymLog",
    description: "Suivi de musculation",
    start_url: "/",
    display: "standalone",
    background_color: PAGE_BACKGROUND[theme.mode],
    theme_color: PAGE_BACKGROUND[theme.mode],
    icons: [
      { src: appIconUrl(theme, 192), sizes: "192x192", type: "image/png" },
      { src: appIconUrl(theme, 512), sizes: "512x512", type: "image/png" },
      { src: appIconUrl(theme, 512), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
