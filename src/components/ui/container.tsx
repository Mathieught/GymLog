import { cn } from "@/lib/utils";

export function Container({
  className,
  topSafeArea,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  // Pages sans PageHeader (onglets principaux) : le contenu commence directement sous l'encoche
  // de sécurité, sans barre d'en-tête séparée (refonte Figma "*-refonte-3").
  topSafeArea?: boolean;
}) {
  return (
    <div
      // Grandit avec l'écran jusqu'à une largeur "tablette" (max-w-3xl, 768px) puis se bloque et se
      // centre — même plafond que PageHeader/BottomNav pour que tout reste aligné à n'importe
      // quelle largeur, pas seulement en dessous ou au-dessus de ce seuil.
      className={cn("mx-auto max-w-3xl px-4 py-6", className)}
      style={topSafeArea ? { paddingTop: "max(env(safe-area-inset-top), 24px)", ...style } : style}
      {...props}
    />
  );
}
