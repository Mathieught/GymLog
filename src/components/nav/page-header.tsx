import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { HeaderOptions } from "@/components/nav/header-options";
import { cn } from "@/lib/utils";

export function PageHeader({
  backHref,
  right,
  className,
}: {
  backHref?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className="sticky top-0 z-10 bg-neutral-50">
      <div className={cn("mx-auto flex max-w-lg items-center justify-between px-4 py-1.5", className)}>
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Retour"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <div className="h-8 w-8" />
        )}
        <div className="flex items-center gap-2">{right ?? <HeaderOptions />}</div>
      </div>
    </header>
  );
}
