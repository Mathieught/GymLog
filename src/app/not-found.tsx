import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// 404 : adresse inconnue, ou élément qui n'existe plus (séance annulée, programme supprimé…) —
// voir les notFound() des pages de détail.
export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        <SearchX className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="max-w-sm text-neutral-500">
        Cette page n&apos;existe pas ou plus : la séance a peut-être été annulée, ou l&apos;élément
        supprimé.
      </p>
      <ButtonLink href="/" className="mt-2">
        Retour à l&apos;accueil
      </ButtonLink>
    </Container>
  );
}
