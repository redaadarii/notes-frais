import "server-only";
import { connection, NextResponse } from "next/server";
import type { z } from "zod";
import type { CurrentUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/identity";
import { AppError, BusinessRuleError, UpstreamError, ValidationError } from "@/server/errors";
import { fieldErrorsOf } from "@/lib/validation";
import type { ProblemDetails } from "@/lib/problem";

/**
 * Socle commun des routes de l'API REST.
 *
 *   export const POST = authenticated(async (request, user, context) => { … });
 *
 * - identifie l'utilisateur (401 sinon) ;
 * - traduit toute erreur en réponse « application/problem+json » (RFC 9457) ;
 * - ne divulgue jamais un détail technique : il part dans les logs.
 */

type ProblemExtensions = Pick<ProblemDetails, "errors" | "rows">;

export function problem(status: number, title: string, detail: string, extensions: ProblemExtensions = {}) {
  const body: ProblemDetails = { type: "about:blank", status, title, detail, ...extensions };
  return NextResponse.json(body, { status, headers: { "Content-Type": "application/problem+json" } });
}

function toResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError || error instanceof BusinessRuleError) {
    return problem(error.status, error.title, error.message, { errors: error.fieldErrors });
  }
  if (error instanceof UpstreamError) {
    // 401/403 de Databricks = l'APPLICATION n'a pas les droits : c'est une erreur de configuration.
    const detail =
      error.upstreamStatus === 401 || error.upstreamStatus === 403
        ? "L'application n'a pas les droits nécessaires sur Databricks"
        : error.upstreamStatus === 429
          ? "Databricks est momentanément saturé, réessayez dans un instant"
          : "Le service Databricks n'a pas pu traiter la demande";
    return problem(error.status, error.title, detail);
  }
  if (error instanceof AppError) {
    return problem(error.status, error.title, error.message);
  }
  console.error("[api] erreur inattendue", error);
  return problem(500, "Erreur interne", "Une erreur inattendue est survenue");
}

type Handler<C> = (request: Request, user: CurrentUser, context: C) => Promise<Response>;

export function authenticated<C = unknown>(handler: Handler<C>) {
  return async (request: Request, context: C): Promise<Response> => {
    // L'API dépend toujours de la requête (identité, données à jour) : jamais pré-calculée au build.
    await connection();
    try {
      const user = await getCurrentUser();
      return await handler(request, user, context);
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** Valide une donnée d'entrée ; en cas d'échec, 400 avec les erreurs par champ. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ValidationError("Certaines valeurs sont invalides", fieldErrorsOf(result.error));
  return result.data;
}

export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const body = await request.json().catch(() => {
    throw new ValidationError("Le corps de la requête doit être du JSON valide");
  });
  return validate(schema, body);
}

export async function readFormData(request: Request): Promise<FormData> {
  return request.formData().catch(() => {
    throw new ValidationError("Formulaire multipart attendu");
  });
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const noContent = () => new NextResponse(null, { status: 204 });
