export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // Présent uniquement en cas de succès (jamais avec error/fieldErrors) : les formulaires ouverts
  // dans une popup n'ont plus de redirect() pour signaler la réussite (ils restent sur la même
  // page, en arrière-plan de la popup), donc un nonce qui change permet de détecter "vient de
  // réussir" dans un effet sans confondre avec un état déjà traité.
  nonce?: number;
};

export const initialActionState: ActionState = {};
