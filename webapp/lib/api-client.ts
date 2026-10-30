import type { ProblemDetails, RowError } from "./problem";

/**
 * Client HTTP de l'écran vers l'API REST /api/v1. Toutes les requêtes passent par ici :
 * une réponse en erreur devient une ApiError typée, exploitable par React Query et les formulaires.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly rowErrors: RowError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Une erreur 4xx ne se corrige pas en réessayant. */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", json, formData, signal }: RequestOptions = {},
) {
  const response = await fetch(`/api/v1${path}`, {
    method,
    signal,
    headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    body: json === undefined ? formData : JSON.stringify(json),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Partial<ProblemDetails> | null;
    throw new ApiError(
      response.status,
      problem?.title ?? "Erreur",
      problem?.detail ?? `Le serveur a répondu ${response.status}`,
      problem?.errors,
      problem?.rows,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: "POST", json: json ?? {} }),
  patch: <T>(path: string, json: unknown) => apiRequest<T>(path, { method: "PATCH", json }),
  put: <T>(path: string, json: unknown) => apiRequest<T>(path, { method: "PUT", json }),
  delete: (path: string) => apiRequest<void>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, method: "POST" | "PUT" = "POST") =>
    apiRequest<T>(path, { method, formData }),
};

/** Message lisible pour un toast, quelle que soit l'erreur. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Impossible de joindre le serveur. Vérifiez votre connexion.";
}
