export const TIME_ZONE_COOKIE = "tz";

// Fuseau horaire de l'utilisateur, envoyé par son navigateur dans un cookie (voir TimeZoneSync) :
// le rendu se fait côté serveur (UTC sur Vercel), donc sans ça toutes les dates et heures seraient
// calculées en UTC. Absent (toute première visite) ou invalide : fuseau de Paris par défaut.
export function parseTimeZone(value: string | undefined): string {
  if (value) {
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: value });
      return value;
    } catch {}
  }
  return "Europe/Paris";
}
