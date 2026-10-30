import "server-only";
import ExcelJS from "exceljs";
import type { RowError } from "@/lib/problem";
import type { Category } from "@/features/categories/types";
import { lineInputSchema, MAX_IMPORT_LINES, type LineInput } from "../schemas";

/**
 * Import de lignes de dépense depuis Excel, et génération du modèle à remplir.
 * Toutes les erreurs sont collectées (pas d'arrêt à la première) pour tout corriger en une fois.
 */

export const SHEET_NAME = "Dépenses";
export const COLUMNS = ["date", "categorie", "description", "montant"] as const;
type Column = (typeof COLUMNS)[number];

export type ParseResult = { ok: true; lines: LineInput[] } | { ok: false; errors: RowError[] };

const MAX_ERRORS = 50;

/** Valeur de cellule ExcelJS → valeur simple (formules, texte enrichi, liens, dates). */
function cellValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10); // Excel stocke les dates en UTC
  if (typeof value === "object") {
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
  }
  return String(value);
}

/** « 1 234,50 » → 1234.5 ; une valeur non numérique est laissée telle quelle pour que Zod la signale. */
function toAmount(value: string | number | null): unknown {
  if (typeof value === "number" || value === null) return value ?? undefined;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(parsed) ? value : parsed;
}

/** « 15/10/2026 » est accepté en plus du format ISO, car c'est ce que tape un utilisateur français. */
function toIsoDate(value: string | number | null): string {
  const text = value === null ? "" : String(value).trim();
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return french ? `${french[3]}-${french[2]}-${french[1]}` : text;
}

const normalize = (header: string) => header.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export async function parseLinesWorkbook(
  content: ArrayBuffer,
  knownCategories: Set<string>,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(content);
  } catch {
    return { ok: false, errors: [{ row: 0, message: "Le fichier n'est pas un classeur Excel lisible" }] };
  }

  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) return { ok: false, errors: [{ row: 0, message: "Le classeur ne contient aucun onglet" }] };

  const positions = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, column) => positions.set(normalize(String(cellValue(cell.value) ?? "")), column));
  const missing = COLUMNS.filter((c) => !positions.has(c));
  if (missing.length) {
    return { ok: false, errors: [{ row: 1, message: `Colonne(s) manquante(s) : ${missing.join(", ")}` }] };
  }

  const lines: LineInput[] = [];
  const errors: RowError[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const read = (column: Column) => cellValue(row.getCell(positions.get(column)!).value);

    const result = lineInputSchema.safeParse({
      expenseDate: toIsoDate(read("date")),
      categoryCode: String(read("categorie") ?? ""),
      description: String(read("description") ?? ""),
      amount: toAmount(read("montant")),
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ row: rowNumber, column: String(issue.path[0] ?? ""), message: issue.message });
      }
      return;
    }
    if (!knownCategories.has(result.data.categoryCode)) {
      errors.push({
        row: rowNumber,
        column: "categoryCode",
        message: `Catégorie inconnue : ${result.data.categoryCode}`,
      });
      return;
    }
    lines.push(result.data);
  });

  if (lines.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: "Le fichier ne contient aucune ligne de dépense" });
  }
  if (lines.length + errors.length > MAX_IMPORT_LINES) {
    errors.unshift({ row: 0, message: `${MAX_IMPORT_LINES} lignes au maximum par import` });
  }
  return errors.length ? { ok: false, errors: errors.slice(0, MAX_ERRORS) } : { ok: true, lines };
}

/** Modèle à remplir : un onglet de saisie avec liste déroulante des catégories, un onglet d'aide. */
export async function buildLinesTemplate(categories: Category[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "date", key: "date", width: 14, style: { numFmt: "dd/mm/yyyy" } },
    { header: "categorie", key: "categorie", width: 16 },
    { header: "description", key: "description", width: 48 },
    { header: "montant", key: "montant", width: 14, style: { numFmt: '#,##0.00 "€"' } },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    date: new Date(),
    categorie: categories[0]?.code ?? "MEAL",
    description: "Exemple : déjeuner client",
    montant: 25.5,
  });

  const codes = categories.map((c) => c.code).join(",");
  for (let row = 2; row <= MAX_IMPORT_LINES + 1; row++) {
    sheet.getCell(`B${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${codes}"`],
      showErrorMessage: true,
      error: "Choisissez une catégorie dans la liste",
    };
  }

  const help = workbook.addWorksheet("Catégories");
  help.columns = [
    { header: "code", key: "code", width: 14 },
    { header: "libellé", key: "label", width: 28 },
    { header: "plafond", key: "unitLimit", width: 12 },
    { header: "justificatif obligatoire", key: "receipt", width: 24 },
  ];
  help.getRow(1).font = { bold: true };
  for (const c of categories) {
    help.addRow({
      code: c.code,
      label: c.label,
      unitLimit: c.unitLimit ?? "aucun",
      receipt: c.receiptRequired ? "oui" : "non",
    });
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
