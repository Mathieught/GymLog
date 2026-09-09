"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, History, Dumbbell, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/workouts", label: "Séances", icon: ListChecks },
  { href: "/history", label: "Historique", icon: History },
  { href: "/exercises", label: "Exercices", icon: Dumbbell },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-0.5 rounded-full bg-neutral-200/70 p-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors",
        active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:bg-white/60"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </Link>
  );
}
