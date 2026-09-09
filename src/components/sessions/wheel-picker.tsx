"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);
const SETTLE_DELAY_MS = 120;

// Molette de sélection façon "picker" mobile : on fait défiler, la valeur au centre s'aimante
// et devient la valeur retenue une fois le geste terminé. L'alignement final est calculé en JS
// (scrollTop forcé, sans animation) plutôt que via scroll-snap CSS, dont l'alignement pixel n'est
// pas toujours garanti une fois le geste terminé sur tous les appareils/zooms.
export function WheelPicker({
  values,
  value,
  onChange,
  format,
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ignore le scroll event synthétique déclenché par notre propre correction de position.
  const isCorrecting = useRef(false);
  const [centerIndex, setCenterIndex] = useState(() => {
    const index = values.indexOf(value);
    return index === -1 ? 0 : index;
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = centerIndex * ITEM_HEIGHT;
    return () => {
      if (settleTimeout.current) clearTimeout(settleTimeout.current);
    };
    // Position initiale uniquement : on ne veut pas re-scroller si `value` change depuis l'extérieur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    if (isCorrecting.current) {
      isCorrecting.current = false;
      return;
    }

    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), values.length - 1);
    setCenterIndex(clamped);

    if (settleTimeout.current) clearTimeout(settleTimeout.current);
    settleTimeout.current = setTimeout(() => {
      // Alignement exact et instantané (pas d'animation) : le scroll-snap CSS ne garantit pas
      // toujours une position pixel-parfaite une fois le geste terminé, d'où ce filet de sécurité.
      const target = clamped * ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - target) > 0.5) {
        isCorrecting.current = true;
        el.scrollTop = target;
      }
      onChange(values[clamped]);
    }, SETTLE_DELAY_MS);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-neutral-100"
        style={{ height: ITEM_HEIGHT }}
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: ITEM_HEIGHT * PADDING_ITEMS }} aria-hidden />
        {values.map((v, index) => (
          <div
            key={v}
            style={{ height: ITEM_HEIGHT }}
            className={cn(
              "flex items-center justify-center text-base tabular-nums transition-colors",
              index === centerIndex ? "font-semibold text-neutral-900" : "text-neutral-400"
            )}
          >
            {format(v)}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * PADDING_ITEMS }} aria-hidden />
      </div>
    </div>
  );
}
