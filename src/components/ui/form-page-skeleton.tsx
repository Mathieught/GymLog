import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function FormPageSkeleton({ backHref, fields = 3 }: { backHref: string; fields?: number }) {
  return (
    <>
      <PageHeader backHref={backHref} />
      <Container>
        <Skeleton className="mb-6 h-7 w-48" />

        <div className="space-y-4">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-8 h-10 w-full rounded-full" />
      </Container>
    </>
  );
}
