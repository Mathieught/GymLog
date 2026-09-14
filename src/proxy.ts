import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // serwist/* sert le service worker et son manifest de précache ; ~offline est la page de
  // secours qu'il affiche hors ligne : ni l'un ni l'autre ne doit dépendre d'une session valide,
  // sous peine de casser l'enregistrement du service worker ou le fallback hors ligne lui-même.
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|serwist|manifest.webmanifest|~offline|icon\\.svg|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png).*)",
  ],
};
