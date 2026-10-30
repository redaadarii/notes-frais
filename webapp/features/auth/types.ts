import type { Permission, Role } from "./roles";

/** Fiche du collaborateur dans le référentiel (table employees). */
export interface EmployeeProfile {
  fullName: string;
  managerEmail: string | null;
  costCenter: string;
  active: boolean;
}

/** Ce que l'application sait de la personne connectée ; renvoyé par GET /api/v1/me. */
export interface CurrentUser {
  email: string;
  displayName: string;
  roles: Role[];
  permissions: Permission[];
  /** null : la personne n'est pas (ou plus) dans le référentiel, elle ne peut rien saisir. */
  employee: EmployeeProfile | null;
  /** Origine des groupes : utile pour comprendre un problème de droits. */
  identitySource: "user-token" | "service-principal" | "dev";
}
