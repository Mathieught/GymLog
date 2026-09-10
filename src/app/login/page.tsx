import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const isDev = process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = typeof callbackUrl === "string" ? callbackUrl : "/workouts";

  return (
    <Container className="flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">GymLog</h1>
        <p className="mt-1 text-sm text-neutral-500">Connecte-toi pour accéder à tes séances.</p>
      </div>

      <form
        className="w-full"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <Button type="submit" className="w-full">
          Se connecter avec Google
        </Button>
      </form>

      {isDev && (
        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("dev", { redirectTo });
          }}
        >
          <Button type="submit" variant="secondary" className="w-full">
            Connexion dev (local uniquement)
          </Button>
        </form>
      )}
    </Container>
  );
}
