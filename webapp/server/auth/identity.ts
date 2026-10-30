import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { permissionsFor, rolesFromGroups, type GroupMapping } from "@/features/auth/roles";
import type { CurrentUser, EmployeeProfile } from "@/features/auth/types";
import { getConfig, isDevelopment } from "@/server/config";
import { databricksJson } from "@/server/databricks/client";
import { queryOne } from "@/server/databricks/sql";
import { sql } from "@/server/databricks/sql-params";
import { UnauthorizedError } from "@/server/errors";

/**
 * Qui est connecté ?
 *
 * Sur Databricks Apps, l'utilisateur s'est authentifié AVANT d'atteindre l'application
 * (SSO Databricks fédéré avec Microsoft Entra ID). Le proxy ajoute à chaque requête :
 *   x-forwarded-email               → e-mail
 *   x-forwarded-preferred-username  → nom affiché
 *   x-forwarded-access-token        → token de l'utilisateur, limité aux user_api_scopes de l'app
 *
 * Ces en-têtes ne sont fiables que parce que l'app n'est joignable qu'à travers ce proxy.
 */

interface ScimUser {
  groups?: { display?: string }[];
}

const GROUPS_CACHE_MS = 60_000; // court : un retrait de groupe doit être pris en compte vite
const groupsCache = new Map<string, { groups: string[]; expiresAt: number }>();

async function groupsFromUserToken(userToken: string): Promise<string[]> {
  // /Me appelé AVEC le token de l'utilisateur : impossible d'usurper l'identité de quelqu'un d'autre.
  const me = await databricksJson<ScimUser>("/api/2.0/preview/scim/v2/Me", { userToken });
  return (me.groups ?? []).map((g) => g.display ?? "").filter(Boolean);
}

async function groupsFromServicePrincipal(email: string): Promise<string[]> {
  // Repli si l'autorisation utilisateur n'est pas activée : le service principal cherche par e-mail.
  const filter = encodeURIComponent(`userName eq "${email.replace(/"/g, "")}"`);
  const result = await databricksJson<{ Resources?: ScimUser[] }>(
    `/api/2.0/preview/scim/v2/Users?filter=${filter}&attributes=groups`,
  );
  return (result.Resources?.[0]?.groups ?? []).map((g) => g.display ?? "").filter(Boolean);
}

async function resolveGroups(email: string, userToken: string | null): Promise<string[]> {
  const cached = groupsCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return cached.groups;

  const groups = userToken ? await groupsFromUserToken(userToken) : await groupsFromServicePrincipal(email);
  groupsCache.set(email, { groups, expiresAt: Date.now() + GROUPS_CACHE_MS });
  return groups;
}

async function findEmployee(email: string): Promise<EmployeeProfile | null> {
  return queryOne<EmployeeProfile>(
    `SELECT full_name AS fullName, manager_email AS managerEmail, cost_center AS costCenter, active
     FROM employees WHERE lower(email) = lower(:email)`,
    { email: sql.string(email) },
  );
}

function groupMapping(): GroupMapping {
  const config = getConfig();
  return {
    EMPLOYEE: config.GROUP_EMPLOYEES,
    MANAGER: config.GROUP_MANAGERS,
    FINANCE: config.GROUP_FINANCE,
    ADMIN: config.GROUP_ADMINS,
  };
}

async function buildUser(
  email: string,
  displayName: string,
  groups: string[],
  identitySource: CurrentUser["identitySource"],
): Promise<CurrentUser> {
  const roles = rolesFromGroups(groups, groupMapping());
  const employee = await findEmployee(email);
  return {
    email: email.toLowerCase(),
    displayName: employee?.fullName ?? displayName,
    roles,
    permissions: permissionsFor(roles),
    employee,
    identitySource,
  };
}

/**
 * Utilisateur courant, ou UnauthorizedError. `cache` de React : calculé une seule fois
 * par requête, même si plusieurs fonctions le demandent.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const h = await headers();
  const email = h.get("x-forwarded-email");

  if (!email) {
    // Développement local : pas de proxy, on simule. Jamais actif en production (next start).
    if (isDevelopment() && process.env.DEV_USER_EMAIL) {
      const groups = (process.env.DEV_USER_GROUPS ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      return buildUser(process.env.DEV_USER_EMAIL, process.env.DEV_USER_EMAIL, groups, "dev");
    }
    throw new UnauthorizedError();
  }

  const userToken = h.get("x-forwarded-access-token");
  const groups = await resolveGroups(email, userToken);
  const displayName = h.get("x-forwarded-preferred-username") ?? email;
  return buildUser(email, displayName, groups, userToken ? "user-token" : "service-principal");
});
