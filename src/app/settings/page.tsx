import { auth, signOut } from "@/lib/auth";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/ui/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppModeToggle } from "@/components/app-mode";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <Container topSafeArea>
      <PageTitle>Paramètres</PageTitle>

      {session?.user && (
        <Card className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{session.user.name ?? "Compte"}</p>
            <p className="text-sm text-neutral-500">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="secondary" size="sm">
              Se déconnecter
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Mode</p>
          <p className="text-sm text-neutral-500">Avancé affiche des fonctionnalités supplémentaires</p>
        </div>
        <AppModeToggle />
      </Card>
    </Container>
  );
}
