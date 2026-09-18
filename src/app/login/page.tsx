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

// Repris du thème sombre permanent de l'app (voir @theme dans globals.css) plutôt que des tokens
// Tailwind directement : une illustration ne doit pas dépendre d'un thème clair qui n'existe plus.
function WelcomeIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden>
      <circle cx="70" cy="70" r="70" fill="#2a3308" />
      <circle cx="104" cy="34" r="5" fill="#c9f22b" />
      <circle cx="28" cy="98" r="4" fill="#c9f22b" />
      <circle cx="112" cy="88" r="3" fill="#c9f22b" />
      <g stroke="#f5f3e9" strokeWidth="7" strokeLinecap="round">
        <line x1="35" y1="70" x2="105" y2="70" />
        <line x1="50" y1="48" x2="50" y2="92" />
        <line x1="90" y1="48" x2="90" y2="92" />
        <line x1="35" y1="56" x2="35" y2="84" />
        <line x1="105" y1="56" x2="105" y2="84" />
      </g>
    </svg>
  );
}
