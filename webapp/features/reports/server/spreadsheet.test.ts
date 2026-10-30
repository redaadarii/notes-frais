import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildLinesTemplate, parseLinesWorkbook, SHEET_NAME } from "./spreadsheet";

const categories = [
  { code: "MEAL", label: "Repas", unitLimit: 300, receiptRequired: true, glAccount: "6257" },
  { code: "HOTEL", label: "Hébergement", unitLimit: 1500, receiptRequired: true, glAccount: "6251" },
];
const known = new Set(categories.map((c) => c.code));

async function workbookWith(rows: unknown[][], headers = ["Date", "Catégorie", "description", "montant"]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

describe("parseLinesWorkbook", () => {
  it("lit des en-têtes accentués, des dates françaises et des montants à virgule", async () => {
    const file = await workbookWith([
      ["15/01/2026", "meal", "Déjeuner client", "1 234,50"],
      [new Date(Date.UTC(2026, 0, 16)), "HOTEL", "Nuit à Lyon", 89],
    ]);
    const result = await parseLinesWorkbook(file, known);
    expect(result).toEqual({
      ok: true,
      lines: [
        { expenseDate: "2026-01-15", categoryCode: "MEAL", description: "Déjeuner client", amount: 1234.5 },
        { expenseDate: "2026-01-16", categoryCode: "HOTEL", description: "Nuit à Lyon", amount: 89 },
      ],
    });
  });

  it("collecte toutes les erreurs avec leur numéro de ligne Excel, et n'importe rien", async () => {
    const file = await workbookWith([
      ["2026-01-15", "MEAL", "Valide", 10],
      ["2026-01-15", "TAXI", "Catégorie inconnue", 10],
      ["2026-01-15", "MEAL", "Montant négatif", -5],
    ]);
    const result = await parseLinesWorkbook(file, known);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.row)).toEqual([3, 4]);
    expect(result.errors[0]!.message).toContain("TAXI");
  });

  it("signale les colonnes manquantes", async () => {
    const result = await parseLinesWorkbook(await workbookWith([], ["date", "montant"]), known);
    expect(result).toEqual({
      ok: false,
      errors: [{ row: 1, message: "Colonne(s) manquante(s) : categorie, description" }],
    });
  });

  it("refuse un fichier qui n'est pas un classeur", async () => {
    const result = await parseLinesWorkbook(
      new TextEncoder().encode("pas un xlsx").buffer as ArrayBuffer,
      known,
    );
    expect(result.ok).toBe(false);
  });
});

describe("buildLinesTemplate", () => {
  it("produit un modèle que l'import accepte tel quel (ligne d'exemple)", async () => {
    const template = await buildLinesTemplate(categories);
    const result = await parseLinesWorkbook(template, known);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines).toHaveLength(1);
  });
});
