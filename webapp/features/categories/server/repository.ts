import "server-only";
import { executeUpdate, query, queryOne } from "@/server/databricks/sql";
import { sql } from "@/server/databricks/sql-params";
import type { CategoryCreate, CategoryUpdate } from "../schemas";
import type { Category } from "../types";

const SELECT = `SELECT code, label, unit_limit AS unitLimit, receipt_required AS receiptRequired, gl_account AS glAccount
                FROM categories`;

export const listCategories = () => query<Category>(`${SELECT} ORDER BY label`);

export const findCategory = (code: string) =>
  queryOne<Category>(`${SELECT} WHERE code = :code`, { code: sql.string(code) });

/** Codes existants parmi ceux demandés : vérification groupée lors d'un import. */
export async function existingCategoryCodes(): Promise<Set<string>> {
  const rows = await query<{ code: string }>(`SELECT code FROM categories`);
  return new Set(rows.map((r) => r.code));
}

export async function insertCategory(input: CategoryCreate): Promise<void> {
  await executeUpdate(
    `INSERT INTO categories (code, label, unit_limit, receipt_required, gl_account)
     VALUES (:code, :label, :unitLimit, :receiptRequired, :glAccount)`,
    {
      code: sql.string(input.code),
      label: sql.string(input.label),
      unitLimit: sql.money(input.unitLimit),
      receiptRequired: sql.boolean(input.receiptRequired),
      glAccount: sql.string(input.glAccount),
    },
  );
}

export function updateCategory(code: string, input: CategoryUpdate): Promise<number> {
  return executeUpdate(
    `UPDATE categories SET label = :label, unit_limit = :unitLimit, receipt_required = :receiptRequired,
            gl_account = :glAccount
     WHERE code = :code`,
    {
      code: sql.string(code),
      label: sql.string(input.label),
      unitLimit: sql.money(input.unitLimit),
      receiptRequired: sql.boolean(input.receiptRequired),
      glAccount: sql.string(input.glAccount),
    },
  );
}
