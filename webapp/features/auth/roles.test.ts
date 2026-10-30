import { describe, expect, it } from "vitest";
import { hasPermission, permissionsFor, rolesFromGroups, type GroupMapping } from "./roles";

const mapping: GroupMapping = {
  EMPLOYEE: "notes-frais-employes",
  MANAGER: "notes-frais-managers",
  FINANCE: "notes-frais-finance",
  ADMIN: "notes-frais-admins",
};

describe("rolesFromGroups", () => {
  it("cumule les rôles de tous les groupes, sans tenir compte de la casse", () => {
    expect(rolesFromGroups(["Notes-Frais-Employes", "notes-frais-managers", "users"], mapping)).toEqual([
      "EMPLOYEE",
      "MANAGER",
    ]);
  });

  it("ne donne aucun rôle hors des groupes de l'application (refus par défaut)", () => {
    expect(rolesFromGroups(["users", "admins"], mapping)).toEqual([]);
  });
});

describe("permissionsFor", () => {
  it("dédoublonne les permissions communes à plusieurs rôles", () => {
    const permissions = permissionsFor(["FINANCE", "ADMIN"]);
    expect(permissions.filter((p) => p === "report:read:all")).toHaveLength(1);
  });

  it("ne permet pas à l'administrateur de valider des dépenses (séparation des tâches)", () => {
    const admin = { permissions: permissionsFor(["ADMIN"]) };
    expect(hasPermission(admin, "category:manage")).toBe(true);
    expect(hasPermission(admin, "report:approve:finance")).toBe(false);
    expect(hasPermission(admin, "report:approve:manager")).toBe(false);
  });
});
