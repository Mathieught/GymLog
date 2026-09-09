import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";

export default function SettingsPage() {
  return (
    <>
      <PageHeader />
      <Container>
        <PageTitle>Paramètres</PageTitle>
        <p className="text-neutral-500">À venir.</p>
      </Container>
    </>
  );
}
