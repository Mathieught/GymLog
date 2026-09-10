import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle>Paramètres</PageTitle>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </Container>
    </>
  );
}
