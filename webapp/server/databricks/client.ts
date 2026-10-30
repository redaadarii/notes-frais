import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getConfig, isDevelopment } from "@/server/config";
import { UpstreamError } from "@/server/errors";

/**
 * Client REST Databricks minimal.
 *
 * Authentification de l'APPLICATION, par ordre de priorité :
 *  1. DATABRICKS_TOKEN                                → token personnel (dev local)
 *  2. DATABRICKS_CLIENT_ID + DATABRICKS_CLIENT_SECRET → OAuth M2M du service principal,
 *     injectés automatiquement par Databricks Apps
 *  3. CLI Databricks (`databricks auth token`)        → dev local sans token, profil OAuth de la CLI
 */

interface CachedToken {
  value: string;
  expiresAt: number;
}

const REFRESH_MARGIN_MS = 60_000;
let cachedToken: CachedToken | null = null;

async function fetchServicePrincipalToken(
  host: string,
  clientId: string,
  clientSecret: string,
): Promise<CachedToken> {
  const response = await fetch(`${host}/oidc/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new UpstreamError(
      "Authentification du service principal impossible",
      response.status,
      "AUTH_FAILED",
    );
  }
  const body = (await response.json()) as { access_token: string; expires_in: number };
  return { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
}

async function fetchCliToken(host: string): Promise<CachedToken> {
  const profile = process.env.DATABRICKS_CONFIG_PROFILE;
  const args = ["auth", "token", "--host", host, ...(profile ? ["--profile", profile] : [])];
  const { stdout } = await promisify(execFile)("databricks", args);
  const body = JSON.parse(stdout) as { access_token: string; expiry: string };
  return { value: body.access_token, expiresAt: new Date(body.expiry).getTime() };
}

async function getAppToken(): Promise<string> {
  if (process.env.DATABRICKS_TOKEN) return process.env.DATABRICKS_TOKEN;
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cachedToken.value;

  const { DATABRICKS_HOST: host } = getConfig();
  const { DATABRICKS_CLIENT_ID: clientId, DATABRICKS_CLIENT_SECRET: clientSecret } = process.env;

  if (clientId && clientSecret) {
    cachedToken = await fetchServicePrincipalToken(host, clientId, clientSecret);
  } else if (isDevelopment()) {
    cachedToken = await fetchCliToken(host);
  } else {
    throw new Error(
      "Aucune authentification Databricks configurée (DATABRICKS_TOKEN ou DATABRICKS_CLIENT_ID/SECRET)",
    );
  }
  return cachedToken.value;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Corps sérialisé en JSON. */
  json?: unknown;
  body?: BodyInit;
  /** Agir au nom de l'utilisateur (token transmis par le proxy Databricks Apps) plutôt que de l'app. */
  userToken?: string;
  /** Statuts d'erreur attendus et gérés par l'appelant (ex. 404 = dossier vide) : pas de log d'erreur. */
  expectedStatuses?: number[];
}

/** Réponse brute : pour les téléchargements de fichiers, que l'on relaie en flux. */
export async function databricksFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const { json, userToken, expectedStatuses = [], headers, ...init } = options;
  const token = userToken ?? (await getAppToken());

  const response = await fetch(`${getConfig().DATABRICKS_HOST}${path}`, {
    ...init,
    body: json === undefined ? init.body : JSON.stringify(json),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(json === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // Format d'erreur Databricks : { error_code, message }
    const body = (await response.json().catch(() => ({}))) as { error_code?: string; message?: string };
    const code = body.error_code ?? `HTTP_${response.status}`;
    if (!expectedStatuses.includes(response.status)) {
      console.error(
        `[databricks] ${init.method ?? "GET"} ${path} → ${response.status} ${code} : ${body.message ?? ""}`,
      );
    }
    throw new UpstreamError(body.message ?? response.statusText, response.status, code);
  }
  return response;
}

/** Appel JSON : renvoie le corps décodé (objet vide si la réponse n'a pas de corps). */
export async function databricksJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await databricksFetch(path, options);
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}
