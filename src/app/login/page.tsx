import { signIn } from "@/lib/auth";
import { Container } from "@/components/ui/container";
import { SignInActions } from "@/components/auth/sign-in-actions";

const isDev = process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = typeof callbackUrl === "string" ? callbackUrl : "/workouts";

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  async function signInDev() {
    "use server";
    await signIn("dev", { redirectTo });
  }

  return (
    <Container className="flex min-h-screen max-w-sm flex-col items-center justify-center gap-8 text-center">
      <WelcomeIllustration />

      <div>
        <h1 className="text-xl font-semibold">GymLog</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Suis tes séances, progresse à chaque passage à la salle.
        </p>
      </div>

      <SignInActions onGoogleSignIn={signInWithGoogle} onDevSignIn={isDev ? signInDev : undefined} />
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
