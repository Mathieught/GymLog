import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailPageSkeleton({ backHref }: { backHref: string }) {
  return (
    <>
      <PageHeader
        backHref={backHref}
        title={<Skeleton className="h-6 w-32" />}
        right={<Skeleton className="h-9 w-24 rounded-full" />}
      />
      <Container>
        <Skeleton className="mb-6 h-4 w-24" />

        <Skeleton className="h-20 w-full rounded-2xl" />

        <ul className="mt-6 space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-16 w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
