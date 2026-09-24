"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

// Envoie le fuseau horaire du navigateur au serveur via un cookie, pour que les dates et heures
// rendues côté serveur suivent l'endroit où se trouve l'utilisateur. Ne rafraîchit la page que si
// le fuseau a changé (première visite, ou voyage) : les rendus suivants l'ont déjà.
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}`;
    if (document.cookie.split("; ").includes(cookie)) return;
    document.cookie = `${cookie}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
