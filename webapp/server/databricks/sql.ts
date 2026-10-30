import "server-only";
import { getConfig } from "@/server/config";
import { UpstreamError } from "@/server/errors";
import { databricksJson } from "./client";
import { decodeRows, toApiParameters, type ColumnInfo, type SqlParams, type SqlRow } from "./sql-params";

/**
 * Exécution de requêtes sur le SQL Warehouse via l'API REST « Statement Execution ».
 * Le catalogue et le schéma sont transmis avec chaque requête : le SQL utilise des noms courts
 * (expense_reports, et non workspace.dev_redaadari_notes_frais.expense_reports).
 */

type StatementState = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "CLOSED";

interface StatementResponse {
  statement_id: string;
  status: { state: StatementState; error?: { error_code?: string; message?: string } };
  manifest?: { schema?: { columns?: ColumnInfo[] } };
  result?: { data_array?: (string | null)[][] };
}

// Le warehouse serverless peut démarrer à froid : on attend jusqu'à 50 s (maximum de l'API),
// puis on interroge l'état jusqu'à POLL_TIMEOUT_MS.
const WAIT_TIMEOUT = "50s";
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 120_000;

async function execute(statement: string, params: SqlParams): Promise<StatementResponse> {
  const config = getConfig();
  let response = await databricksJson<StatementResponse>("/api/2.0/sql/statements", {
    method: "POST",
    json: {
      warehouse_id: config.DATABRICKS_WAREHOUSE_ID,
      catalog: config.APP_CATALOG,
      schema: config.APP_SCHEMA,
      statement,
      parameters: toApiParameters(statement, params),
      wait_timeout: WAIT_TIMEOUT,
      on_wait_timeout: "CONTINUE",
      disposition: "INLINE",
      format: "JSON_ARRAY",
    },
  });

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (response.status.state === "PENDING" || response.status.state === "RUNNING") {
    if (Date.now() > deadline) throw new UpstreamError("Le SQL Warehouse ne répond pas", 504, "SQL_TIMEOUT");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    response = await databricksJson<StatementResponse>(`/api/2.0/sql/statements/${response.statement_id}`);
  }

  if (response.status.state !== "SUCCEEDED") {
    const { error_code = response.status.state, message = "Échec de la requête SQL" } =
      response.status.error ?? {};
    console.error(`[sql] ${error_code} : ${message}\n${statement}`);
    throw new UpstreamError("Échec d'une requête sur le SQL Warehouse", 500, error_code);
  }
  return response;
}

/** SELECT : renvoie les lignes typées. */
export async function query<T = SqlRow>(statement: string, params: SqlParams = {}): Promise<T[]> {
  const response = await execute(statement, params);
  const columns = response.manifest?.schema?.columns ?? [];
  return decodeRows(columns, response.result?.data_array ?? []) as T[];
}

export async function queryOne<T = SqlRow>(statement: string, params: SqlParams = {}): Promise<T | null> {
  const rows = await query<T>(statement, params);
  return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE / MERGE : renvoie le nombre de lignes touchées. */
export async function executeUpdate(statement: string, params: SqlParams = {}): Promise<number> {
  const [row] = await query<{ num_affected_rows?: number }>(statement, params);
  return row?.num_affected_rows ?? 0;
}
