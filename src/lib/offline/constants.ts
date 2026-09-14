// Clé localStorage (pas IndexedDB : lecture synchrone nécessaire dès le premier rendu de
// /~offline) posée dès qu'une page a été rendue avec une session authentifiée valide.
export const AUTHENTICATED_STORAGE_KEY = "gymlog:authenticated";
