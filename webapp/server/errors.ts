/**
 * Erreurs métier. Les services les lèvent ; seule la couche HTTP (server/http/route.ts)
 * les traduit en codes et en réponses : aucun service ne connaît HTTP.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly title: string;
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly title = "Non authentifié";
  constructor(message = "Utilisateur non identifié") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly title = "Accès refusé";
  constructor(message = "Vous n'avez pas les droits pour effectuer cette action") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly title = "Introuvable";
}

/** L'état a changé entre la lecture et l'écriture (autre onglet, autre valideur…). */
export class ConflictError extends AppError {
  readonly status = 409;
  readonly title = "Conflit";
}

/** Requête mal formée : corps, paramètres ou fichier invalides au regard du schéma Zod. */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly title = "Requête invalide";
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

/** Règle métier non respectée, ou saisie invalide ; `fieldErrors` cible les champs du formulaire. */
export class BusinessRuleError extends AppError {
  readonly status = 422;
  readonly title = "Règle métier non respectée";
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

/** Databricks a répondu en erreur : le détail technique va dans les logs, pas à l'utilisateur. */
export class UpstreamError extends AppError {
  readonly status = 502;
  readonly title = "Service Databricks indisponible";
  constructor(
    message: string,
    readonly upstreamStatus: number,
    readonly upstreamCode: string,
  ) {
    super(message);
  }
}
