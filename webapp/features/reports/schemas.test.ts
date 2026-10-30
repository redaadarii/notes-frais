import { describe, expect, it } from "vitest";
import { lineInputSchema, periodSchema, transitionInputSchema } from "./schemas";

const validLine = {
  expenseDate: "2026-01-15",
  categoryCode: "meal",
  description: "Déjeuner client",
  amount: "42.5",
};

describe("lineInputSchema", () => {
  it("normalise la saisie : code en majuscules, montant converti en nombre", () => {
    expect(lineInputSchema.parse(validLine)).toEqual({ ...validLine, categoryCode: "MEAL", amount: 42.5 });
  });

  it.each([
    ["amount", "0", "supérieur à 0"],
    ["amount", "12.345", "Deux décimales"],
    ["amount", "abc", "nombre"],
    ["expenseDate", "2999-01-01", "futur"],
    ["expenseDate", "15/01/2026", "Date invalide"],
    ["description", "ok", "au moins 3"],
  ])("refuse %s = %s", (field, value, message) => {
    const result = lineInputSchema.safeParse({ ...validLine, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(message);
  });
});

describe("periodSchema", () => {
  it.each(["2026-10", "2026-01"])("accepte %s", (p) => expect(periodSchema.safeParse(p).success).toBe(true));
  it.each(["2026-13", "2026-1", "10-2026"])("refuse %s", (p) =>
    expect(periodSchema.safeParse(p).success).toBe(false),
  );
});

describe("transitionInputSchema", () => {
  it("exige un motif pour un rejet, et le rattache au champ comment", () => {
    const result = transitionInputSchema.safeParse({ action: "REJECT", comment: "non" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["comment"]);
  });

  it("n'exige pas de commentaire pour une validation", () => {
    expect(transitionInputSchema.safeParse({ action: "APPROVE" }).success).toBe(true);
  });
});
