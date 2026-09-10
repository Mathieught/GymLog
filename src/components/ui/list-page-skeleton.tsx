import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";

// Réplique la forme de PageTitle avec action pour éviter un saut de hauteur au chargement.
export function ListPageSkeleton({
  title,
  withAction = false,
  rows = 4,
}: {
  title: string;
  withAction?: boolean;
  rows?: number;
}) {
  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle action={withAction ? <Skeleton className="h-9 w-32 rounded-full" /> : undefined}>
          {title}
        </PageTitle>

        <ul className="space-y-2">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i}>
              <Card>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
