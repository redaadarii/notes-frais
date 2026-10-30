import { describe, expect, it } from "vitest";
import { permissionsFor } from "@/features/auth/roles";
import type { ReportStatus } from "./types";
import { allowedActions, canView, capabilitiesOf, nextStatus, type WorkflowReport } from "./workflow";

const employee = { email: "reda@exemple.com", permissions: permissionsFor(["EMPLOYEE"]) };
const manager = { email: "karim@exemple.com", permissions: permissionsFor(["EMPLOYEE", "MANAGER"]) };
const otherManager = { email: "nadia@exemple.com", permissions: permissionsFor(["MANAGER"]) };
const finance = { email: "sara@exemple.com", permissions: permissionsFor(["FINANCE"]) };
const admin = { email: "admin@exemple.com", permissions: permissionsFor(["ADMIN"]) };

const report = (status: ReportStatus, overrides: Partial<WorkflowReport> = {}): WorkflowReport => ({
  status,
  employeeEmail: employee.email,
  managerEmail: status === "DRAFT" ? null : manager.email,
  ...overrides,
});

describe("allowedActions", () => {
  it.each<ReportStatus>(["DRAFT", "REJECTED"])("l'auteur peut soumettre une note %s", (status) => {
    expect(allowedActions(report(status), employee)).toEqual(["SUBMIT"]);
  });

  it("seul le manager figé à la soumission décide au premier niveau", () => {
    expect(allowedActions(report("SUBMITTED"), manager)).toEqual(["APPROVE", "REJECT"]);
    expect(allowedActions(report("SUBMITTED"), otherManager)).toEqual([]);
    expect(allowedActions(report("SUBMITTED"), finance)).toEqual([]);
  });

  it("la finance décide au second niveau, le manager plus", () => {
    expect(allowedActions(report("MANAGER_APPROVED"), finance)).toEqual(["APPROVE", "REJECT"]);
    expect(allowedActions(report("MANAGER_APPROVED"), manager)).toEqual([]);
  });

  it("personne ne valide sa propre note, même avec le bon rôle", () => {
    const financeOwnReport = report("MANAGER_APPROVED", { employeeEmail: finance.email });
    expect(allowedActions(financeOwnReport, finance)).toEqual([]);
  });

  it.each<ReportStatus>(["APPROVED", "EXPORTED"])("plus aucune action humaine sur une note %s", (status) => {
    for (const user of [employee, manager, finance, admin])
      expect(allowedActions(report(status), user)).toEqual([]);
  });
});

describe("capabilitiesOf", () => {
  it("seul un brouillon est supprimable ; une note rejetée reste modifiable", () => {
    expect(capabilitiesOf(report("DRAFT"), employee)).toMatchObject({ canEdit: true, canDelete: true });
    expect(capabilitiesOf(report("REJECTED"), employee)).toMatchObject({ canEdit: true, canDelete: false });
    expect(capabilitiesOf(report("SUBMITTED"), employee)).toMatchObject({ canEdit: false, canDelete: false });
  });

  it("personne d'autre que l'auteur ne modifie une note", () => {
    expect(capabilitiesOf(report("DRAFT"), finance).canEdit).toBe(false);
  });
});

describe("canView", () => {
  it("l'auteur, son manager et les profils « tout voir » lisent la note", () => {
    expect(canView(report("SUBMITTED"), employee)).toBe(true);
    expect(canView(report("SUBMITTED"), manager)).toBe(true);
    expect(canView(report("SUBMITTED"), finance)).toBe(true);
    expect(canView(report("SUBMITTED"), admin)).toBe(true);
  });

  it("un autre manager ne voit pas la note, ni le manager un brouillon non soumis", () => {
    expect(canView(report("SUBMITTED"), otherManager)).toBe(false);
    expect(canView(report("DRAFT"), manager)).toBe(false);
  });
});

describe("nextStatus", () => {
  it("enchaîne les deux niveaux de validation", () => {
    expect(nextStatus("DRAFT", "SUBMIT", true)).toBe("SUBMITTED");
    expect(nextStatus("SUBMITTED", "APPROVE", true)).toBe("MANAGER_APPROVED");
    expect(nextStatus("MANAGER_APPROVED", "APPROVE", true)).toBe("APPROVED");
  });

  it("sans manager, la soumission va directement à la finance", () => {
    expect(nextStatus("DRAFT", "SUBMIT", false)).toBe("MANAGER_APPROVED");
  });

  it("un rejet est possible aux deux niveaux", () => {
    expect(nextStatus("SUBMITTED", "REJECT", true)).toBe("REJECTED");
    expect(nextStatus("MANAGER_APPROVED", "REJECT", true)).toBe("REJECTED");
  });

  it("refuse une transition incohérente", () => {
    expect(() => nextStatus("APPROVED", "APPROVE", true)).toThrow(/Transition impossible/);
  });
});
