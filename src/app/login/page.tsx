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
    <Container className="flex min-h-screen max-w-sm flex-col items-center justify-center gap-8 text-center">
      <WelcomeIllustration />

      <div>
        <h1 className="text-2xl font-semibold">GymLog</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Suis tes séances, progresse à chaque passage à la salle.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <Button type="submit" variant="secondary" className="w-full gap-3 border border-neutral-200">
            <GoogleLogo />
            Continuer avec Google
          </Button>
        </form>

        {isDev && (
          <form
            action={async () => {
              "use server";
              await signIn("dev", { redirectTo });
            }}
          >
            <Button type="submit" variant="ghost" className="w-full">
              Connexion dev (local uniquement)
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}

function WelcomeIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden>
      <circle cx="70" cy="70" r="70" fill="#FFF3E0" />
      <circle cx="104" cy="34" r="5" fill="#FDBA74" />
      <circle cx="28" cy="98" r="4" fill="#FDBA74" />
      <circle cx="112" cy="88" r="3" fill="#FDBA74" />
      <g stroke="#171717" strokeWidth="7" strokeLinecap="round">
        <line x1="35" y1="70" x2="105" y2="70" />
        <line x1="50" y1="48" x2="50" y2="92" />
        <line x1="90" y1="48" x2="90" y2="92" />
        <line x1="35" y1="56" x2="35" y2="84" />
        <line x1="105" y1="56" x2="105" y2="84" />
      </g>
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
