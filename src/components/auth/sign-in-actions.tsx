"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

// true côté serveur/hydratation (navigator n'existe pas encore) : évite un flash du message hors
// ligne pour le cas normal (en ligne).
function getServerOnlineSnapshot() {
  return true;
}

// La connexion Google est un aller-retour réseau (redirection OAuth) : sans ça, le clic plante
// avec une erreur peu claire. Mieux vaut désactiver l'action et l'expliquer que laisser planter.
export function SignInActions({
  onGoogleSignIn,
  onDevSignIn,
}: {
  onGoogleSignIn: () => Promise<void>;
  onDevSignIn?: () => Promise<void>;
}) {
  const isOnline = useSyncExternalStore(subscribeToConnectivity, getOnlineSnapshot, getServerOnlineSnapshot);

  if (!isOnline) {
    return (
      <p className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
        Hors ligne — active le Wi-Fi ou les données mobiles pour te connecter.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <form action={onGoogleSignIn}>
        <Button type="submit" size="lg" className="w-full gap-3 rounded-[14px] font-semibold">
          {/* Pastille blanche fixe (pas le token "white", sombre en mode sombre) : le logo Google
              garde ses couleurs sur l'aplat d'accent. */}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff]">
            <GoogleLogo />
          </span>
          Continuer avec Google
        </Button>
      </form>

      {onDevSignIn && (
        <form action={onDevSignIn}>
          <Button type="submit" variant="ghost" className="w-full">
            Connexion dev (local uniquement)
          </Button>
        </form>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
