import { ImageResponse } from "next/og";
import { PAGE_BACKGROUND, parseTheme, themeVariables } from "@/lib/theme";

// Icône de l'app aux couleurs du thème (?t=dark.vert&s=180) : fond de page du mode, haltère en
// couleur d'accent lisible (accent-deep). Le thème est dans l'URL, donc cache long sans risque.
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const theme = parseTheme(params.get("t") ?? undefined);
  const size = Math.min(512, Math.max(16, Number(params.get("s")) || 180));

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAGE_BACKGROUND[theme.mode] }}>
        <svg width={size} height={size} viewBox="0 0 512 512">
          <g stroke={themeVariables(theme)["--accent-deep"]} strokeWidth={28} strokeLinecap="round">
            <line x1="96" y1="256" x2="416" y2="256" />
            <line x1="140" y1="176" x2="140" y2="336" />
            <line x1="372" y1="176" x2="372" y2="336" />
            <line x1="96" y1="208" x2="96" y2="304" />
            <line x1="416" y1="208" x2="416" y2="304" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}
