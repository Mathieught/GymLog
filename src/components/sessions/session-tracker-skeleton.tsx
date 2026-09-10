import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function SessionTrackerSkeleton({ backHref }: { backHref: string }) {
  return (
    <>
      <PageHeader backHref={backHref} className="max-w-2xl" />
      <Container className="max-w-2xl">
        <Skeleton className="mb-4 h-7 w-40" />

        <div className="mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>

        <ul className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-14 w-full rounded-2xl" />
            </li>
          ))}
        </ul>

        <Skeleton className="mt-3 h-9 w-full rounded-full" />
      </Container>
    </>
  );
}
