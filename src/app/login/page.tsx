import { Cloud, History, KeyRound, WifiOff, type LucideIcon } from "lucide-react";
import { signIn } from "@/lib/auth";
import { SignInActions } from "@/components/auth/sign-in-actions";

const isDev = process.env.NODE_ENV !== "production";

// Points forts de l'app, listés entre le sous-titre et le bouton de connexion.
const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: History, title: "Charges pré-remplies", text: "D’après ta dernière séance." },
  { icon: Cloud, title: "Sauvegardé", text: "Sur tous tes appareils." },
  { icon: WifiOff, title: "Sans réseau", text: "Même en salle au sous-sol." },
  { icon: KeyRound, title: "Sans mot de passe", text: "Ton compte Google suffit." },
];

// Maquette de référence : "Z1 · Les 4 avantages en liste aérée" (canevas Page de connexion GymLog).
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
    <div
      // 390 px = largeur de l'artboard Z1 (colonne de 350 px une fois les marges retirées).
      className="mx-auto flex min-h-dvh max-w-[390px] flex-col px-5"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 28px)",
      }}
    >
      <p className="flex items-center gap-2">
        <DumbbellMark />
        <span className="text-lg font-bold tracking-[-0.02em]">
          Gym<span className="text-accent-deep">Log</span>
        </span>
      </p>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-[32px] leading-[1.06] font-extrabold tracking-[-0.03em]">
          Note ta séance.
          <br />
          <span className="text-accent-deep">GymLog retient le reste.</span>
        </h1>
        <p className="mt-3 mb-8 text-base leading-normal text-neutral-600">
          Tout ce qu&apos;il faut pour suivre ta muscu, rien de plus.
        </p>

        <ul className="flex flex-col gap-4.5">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold">{title}</span>
                <span className="text-sm text-neutral-600">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <SignInActions onGoogleSignIn={signInWithGoogle} onDevSignIn={isDev ? signInDev : undefined} />
      <p className="mt-2.5 text-center text-xs text-neutral-500">Gratuit, sans abonnement.</p>
    </div>
  );
}

// Même haltère que l'écran de lancement (voir SplashScreen), en couleur d'accent.
function DumbbellMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 140 140" fill="none" aria-hidden="true" className="text-accent-deep">
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        <line x1="35" y1="70" x2="105" y2="70" />
        <line x1="50" y1="46" x2="50" y2="94" />
        <line x1="90" y1="46" x2="90" y2="94" />
        <line x1="33" y1="56" x2="33" y2="84" />
        <line x1="107" y1="56" x2="107" y2="84" />
      </g>
    </svg>
  );
}
