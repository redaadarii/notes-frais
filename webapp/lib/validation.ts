import type { z } from "zod";

/**
 * Erreurs Zod → { champ: [messages] }. Utilisé à l'identique par le formulaire (retour immédiat)
 * et par l'API (vraie barrière), pour que les messages soient les mêmes des deux côtés.
 * Un chemin imbriqué devient « lines.2.amount ».
 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
