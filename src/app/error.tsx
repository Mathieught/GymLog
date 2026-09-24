"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Erreur inattendue dans une page : garde la nav et le thème (rendu sous le layout racine) et
// propose de réessayer — retry() relance le rendu serveur du segment, utile après une coupure
// réseau ou base passagère.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">Quelque chose s&apos;est mal passé</h1>
      <p className="max-w-sm text-neutral-500">
        Cette page n&apos;a pas pu s&apos;afficher. Tes séries déjà validées ne sont pas perdues.
      </p>
      <div className="mt-2 flex gap-2">
        <Button type="button" onClick={() => retry()}>
          Réessayer
        </Button>
        <ButtonLink href="/" variant="secondary">
          Accueil
        </ButtonLink>
      </div>
      {/* Référence de l'erreur dans les logs serveur, à donner en cas de souci. */}
      {error.digest && <p className="font-mono text-xs text-neutral-400">Réf. {error.digest}</p>}
    </Container>
  );
}
