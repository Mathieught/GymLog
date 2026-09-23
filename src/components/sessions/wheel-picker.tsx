"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Légèrement agrandi (36 -> 44px, la taille de cible tactile recommandée) pour rendre chaque
// valeur un peu plus simple à toucher précisément ; la hauteur de la popup en dépend directement
// (WHEEL_HEIGHT ci-dessous), donc elle grandit d'autant.
export const WHEEL_ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);
const SETTLE_DELAY_MS = 120;
// Hauteur totale nécessairement exacte : le calage du bandeau de sélection et le padding haut/bas
// du rail supposent tous les deux que le conteneur mesure pile VISIBLE_ITEMS lignes. Le laisser
// dépendre d'un layout flexible (ex. flex-1 dans un parent en %/vh) désynchronise ce calcul du
// rendu réel et décale visuellement la sélection — d'où une hauteur fixe imposée ici plutôt que
// négociée par le parent.
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS;
const ITEM_HEIGHT = WHEEL_ITEM_HEIGHT;

// Molette de sélection façon "picker" mobile : on fait défiler, la valeur au centre s'aimante
// et devient la valeur retenue une fois le geste terminé. L'alignement final est calculé en JS
// (scrollTop forcé, sans animation) plutôt que via scroll-snap CSS, dont l'alignement pixel n'est
// pas toujours garanti une fois le geste terminé sur tous les appareils/zooms.
// Le bandeau de sélection n'est pas dessiné ici mais par le parent (voir SetValueSheet), pour
// qu'un seul bandeau relie plusieurs molettes en une ligne lisible ("10 × 30.50").
export function WheelPicker({
  values,
  value,
  onChange,
  format,
  align = "center",
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  align?: "left" | "center" | "right";
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

  // Alternative au défilement : toucher directement un chiffre l'amène au centre et le retient
  // aussitôt (retour visuel immédiat), l'animation de la molette suit ensuite pour confirmer.
  function selectIndex(index: number) {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(index, 0), values.length - 1);
    setCenterIndex(clamped);
    onChange(values[clamped]);
    el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
  }

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
    <div className="relative w-full" style={{ height: WHEEL_HEIGHT }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-20 h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: ITEM_HEIGHT * PADDING_ITEMS }} aria-hidden />
        {values.map((v, index) => (
          <div
            key={v}
            role="button"
            tabIndex={0}
            onClick={() => selectIndex(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectIndex(index);
              }
            }}
            style={{ height: ITEM_HEIGHT }}
            className={cn(
              "flex cursor-pointer items-center font-mono text-base tabular-nums transition-colors",
              align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center",
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
