import { Check, Cloud, History, KeyRound, WifiOff, type LucideIcon } from "lucide-react";
import { signIn } from "@/lib/auth";
import { SignInActions } from "@/components/auth/sign-in-actions";
import { cn } from "@/lib/utils";

const isDev = process.env.NODE_ENV !== "production";

// Points forts sous l'aperçu (le 1er, "Charges pré-remplies", est illustré par l'aperçu lui-même).
const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Cloud, title: "Sauvegardé", text: "Dans ton compte, sur tous tes appareils." },
  { icon: WifiOff, title: "Sans réseau", text: "Parfait pour les salles en sous-sol." },
  { icon: KeyRound, title: "Sans mot de passe", text: "Ton compte Google suffit." },
];

// Maquette de référence : "Y2 · L'aperçu remplace la 1re tuile" (canevas Page de connexion GymLog).
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
      // 390 px = largeur de l'artboard Y2 (colonne de 350 px une fois les marges retirées).
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
        <p className="mt-3 mb-4.5 text-base leading-normal text-neutral-600">
          Tout ce qu&apos;il faut pour suivre ta muscu, rien de plus.
        </p>

        <SessionPreview />

        <ul className="mt-2 grid grid-cols-3 gap-2">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-1.5 rounded-2xl bg-neutral-100 p-2.5">
              <Icon className="h-[17px] w-[17px] text-accent-deep" aria-hidden="true" />
              <span className="text-[13px] leading-[1.2] font-semibold">{title}</span>
              <span className="text-[11px] leading-[1.3] text-neutral-500">{text}</span>
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

// Aperçu figé d'une séance (mêmes codes visuels que SetRow) : illustre le point fort principal,
// les charges pré-remplies d'après la séance précédente.
function SessionPreview() {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-neutral-100 p-3">
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Développé couché</span>
          <span className="text-xs text-neutral-500">Aujourd&apos;hui</span>
        </div>
        <PreviewSetRow setNumber={1} value="10 × 60 kg" done />
        <PreviewSetRow setNumber={2} value="10 × 62,5 kg" />
      </div>
      <p className="mt-0.5 flex items-center gap-2">
        <History className="h-[15px] w-[15px] shrink-0 text-accent-deep" aria-hidden="true" />
        <span className="text-[13px] font-semibold">Charges pré-remplies</span>
        <span className="text-xs text-neutral-500">d&apos;après ta dernière séance</span>
      </p>
    </div>
  );
}

function PreviewSetRow({ setNumber, value, done = false }: { setNumber: number; value: string; done?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-[13px] border border-neutral-200 bg-white px-2.5",
        !done && "ring-2 ring-accent"
      )}
    >
      <span className="w-3.5 text-center text-[13px] text-neutral-500">{setNumber}</span>
      <span
        className={cn(
          "flex-1 font-mono text-[13px] font-medium tabular-nums",
          done ? "text-neutral-900" : "text-neutral-400"
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "flex h-6.5 w-6.5 items-center justify-center rounded-full",
          done ? "bg-accent-soft text-accent-deep" : "ring-1 ring-neutral-300 ring-inset"
        )}
      >
        {done && <Check className="h-3 w-3" strokeWidth={2} />}
      </span>
    </div>
  );
}
