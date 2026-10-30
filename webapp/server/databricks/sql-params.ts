/**
 * Paramètres nommés des requêtes SQL (:nom dans le texte de la requête).
 * La valeur ne se mélange JAMAIS au texte SQL : c'est la protection contre l'injection.
 *
 * Module pur (pas de "server-only") : il est testé unitairement.
 */

export type SqlType = "STRING" | "DATE" | "TIMESTAMP" | "BOOLEAN" | "INT" | "DECIMAL(12,2)";

export interface SqlParam {
  type: SqlType;
  value: string | null;
}

export type SqlParams = Record<string, SqlParam>;

const of =
  <T>(type: SqlType, serialize: (value: T) => string) =>
  (value: T | null | undefined): SqlParam => ({
    type,
    value: value === null || value === undefined ? null : serialize(value),
  });

export const sql = {
  string: of<string>("STRING", (v) => v),
  /** Date ISO « AAAA-MM-JJ ». */
  date: of<string>("DATE", (v) => v),
  timestamp: of<Date>("TIMESTAMP", (v) => v.toISOString()),
  boolean: of<boolean>("BOOLEAN", (v) => String(v)),
  int: of<number>("INT", (v) => String(Math.trunc(v))),
  /** Montant : arrondi au centime AVANT l'envoi, pour ne jamais transmettre 12.300000000001. */
  money: of<number>("DECIMAL(12,2)", (v) => v.toFixed(2)),
};

/**
 * Format attendu par l'API Statement Execution ; une valeur absente vaut NULL.
 * Seuls les paramètres réellement cités dans la requête sont transmis : l'API refuse les autres.
 */
export function toApiParameters(statement: string, params: SqlParams) {
  return Object.entries(params)
    .filter(([name]) => new RegExp(`:${name}\\b`).test(statement))
    .map(([name, { type, value }]) => (value === null ? { name, type } : { name, type, value }));
}

export interface ColumnInfo {
  name: string;
  type_name: string;
}

export type SqlValue = string | number | boolean | null;
export type SqlRow = Record<string, SqlValue>;

/**
 * L'API renvoie toutes les valeurs en texte : on les convertit selon le type de colonne.
 * Les dates et horodatages restent en texte ISO, directement sérialisables en JSON.
 */
export function decodeRows(columns: ColumnInfo[], data: (string | null)[][]): SqlRow[] {
  return data.map((values) =>
    Object.fromEntries(columns.map((column, i) => [column.name, decodeValue(column.type_name, values[i])])),
  );
}

function decodeValue(typeName: string, raw: string | null): SqlValue {
  if (raw === null) return null;
  switch (typeName) {
    case "BOOLEAN":
      return raw === "true";
    case "INT":
    case "LONG":
    case "SHORT":
    case "BYTE":
    case "DECIMAL":
    case "DOUBLE":
    case "FLOAT":
      return Number(raw);
    case "TIMESTAMP":
    case "TIMESTAMP_NTZ":
      // « 2026-10-29T10:00:00.000Z » : la même forme quel que soit le fuseau du warehouse
      return new Date(
        raw.includes("T") || raw.endsWith("Z") ? raw : `${raw.replace(" ", "T")}Z`,
      ).toISOString();
    default:
      return raw;
  }
}
