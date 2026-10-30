/**
 * Rôles applicatifs et permissions. Module pur, partagé par le serveur et l'écran :
 * l'écran masque ce que l'utilisateur ne peut pas faire, le serveur l'INTERDIT.
 *
 * L'application ne gère aucune liste d'utilisateurs : elle lit les GROUPES de la personne
 * (groupes Entra ID synchronisés dans Databricks par SCIM) et en déduit ses rôles.
 * Les rôles se CUMULENT : un manager est aussi un collaborateur qui saisit ses propres notes.
 */

export const ROLES = ["EMPLOYEE", "MANAGER", "FINANCE", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "report:create" // saisir ses propres notes
  | "report:approve:manager" // valider les notes de son équipe (1er niveau)
  | "report:approve:finance" // valider les notes validées par le manager (2e niveau)
  | "report:read:all" // consulter toutes les notes
  | "export:run" // lancer l'export comptable
  | "category:manage" // administrer les catégories de dépense
  | "employee:read"; // consulter le référentiel des collaborateurs

const PERMISSIONS_BY_ROLE: Record<Role, readonly Permission[]> = {
  EMPLOYEE: ["report:create"],
  MANAGER: ["report:approve:manager"],
  FINANCE: ["report:approve:finance", "report:read:all", "export:run", "employee:read"],
  // L'administrateur paramètre l'application, il ne valide pas les dépenses (séparation des tâches).
  ADMIN: ["category:manage", "report:read:all", "employee:read"],
};

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "Collaborateur",
  MANAGER: "Manager",
  FINANCE: "Finance",
  ADMIN: "Administrateur",
};

export type GroupMapping = Record<Role, string>;

/** Groupes → rôles, sans tenir compte de la casse (Entra ID et Databricks ne la normalisent pas). */
export function rolesFromGroups(groups: readonly string[], mapping: GroupMapping): Role[] {
  const memberOf = new Set(groups.map((g) => g.toLowerCase()));
  return ROLES.filter((role) => memberOf.has(mapping[role].toLowerCase()));
}

export function permissionsFor(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => PERMISSIONS_BY_ROLE[role]))];
}

export function hasPermission(user: { permissions: readonly Permission[] }, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
