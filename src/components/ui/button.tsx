import { type ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const variantClasses = {
  // L'accent vert est la couleur de marque de l'app : action principale partout (au lieu du
  // noir/blanc neutre), pas seulement les confirmations de réussite.
  primary: "bg-accent text-accent-contrast hover:brightness-95",
  secondary: "border border-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
  // Teinte translucide de l'orange corail défini dans globals.css (--color-danger), plutôt qu'un
  // rouge Tailwind par défaut — couleur de suppression validée dans la proposition d'origine.
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
  ghost: "text-neutral-600 hover:bg-neutral-100",
} as const;

const sizeClasses = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-5 text-base",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

// active:scale : retour tactile d'un vrai appui physique, absent auparavant — surtout sensible sur
// le bouton primaire, la plupart des confirmations de l'app (valider une série, etc.).
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[color,background-color,transform] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(base, variantClasses[variant], sizeClasses[size], className)}
    {...props}
  />
));
Button.displayName = "Button";

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  );
}
