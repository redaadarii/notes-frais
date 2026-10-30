import "server-only";
import type { CurrentUser } from "@/features/auth/types";
import { requirePermission } from "@/server/auth/authorization";
import { getConfig } from "@/server/config";
import { downloadFile, listDirectory } from "@/server/databricks/files";
import { getRun, listRuns, runJob, type JobRun } from "@/server/databricks/jobs";
import { queryOne } from "@/server/databricks/sql";
import { sql } from "@/server/databricks/sql-params";
import { ConflictError, NotFoundError } from "@/server/errors";
import type { ExportRun, PeriodExportStatus } from "../types";

/** Export comptable : déclenché ici, exécuté par le job Databricks export_accounting. */

const toExportRun = (run: JobRun): ExportRun => ({
  runId: run.runId,
  status: run.status,
  period: run.parameters.period || "mois précédent",
  requestedBy: run.parameters.requested_by || "planification",
  startedAt: run.startedAt,
  endedAt: run.endedAt,
  message: run.message,
});

export async function listExportRuns(user: CurrentUser): Promise<ExportRun[]> {
  requirePermission(user, "export:run");
  return (await listRuns(getConfig().EXPORT_JOB_ID)).map(toExportRun);
}

export async function getExportRun(user: CurrentUser, runId: number): Promise<ExportRun> {
  requirePermission(user, "export:run");
  const run = await getRun(runId);
  // On ne divulgue pas les runs d'autres jobs, même à un utilisateur habilité.
  if (run.jobId !== getConfig().EXPORT_JOB_ID) throw new NotFoundError("Export introuvable");
  return toExportRun(run);
}

export async function startExport(user: CurrentUser, period: string): Promise<ExportRun> {
  requirePermission(user, "export:run");
  const { EXPORT_JOB_ID } = getConfig();

  const running = (await listRuns(EXPORT_JOB_ID, 5)).find(
    (r) => r.status === "PENDING" || r.status === "RUNNING",
  );
  if (running) throw new ConflictError("Un export est déjà en cours : attendez qu'il se termine");

  const runId = await runJob(EXPORT_JOB_ID, { period, requested_by: user.email });
  console.info(JSON.stringify({ event: "export_started", by: user.email, period, runId }));
  return toExportRun({
    runId,
    jobId: EXPORT_JOB_ID,
    status: "PENDING",
    parameters: { period, requested_by: user.email },
    startedAt: new Date().toISOString(),
    endedAt: null,
    message: null,
  });
}

export async function getPeriodStatus(user: CurrentUser, period: string): Promise<PeriodExportStatus> {
  requirePermission(user, "export:run");
  const [pending, entries] = await Promise.all([
    queryOne<{ approvedCount: number; approvedAmount: number }>(
      `SELECT COUNT(*) AS approvedCount, coalesce(SUM(total_amount), 0) AS approvedAmount
       FROM expense_reports WHERE status = 'APPROVED' AND period = :period`,
      { period: sql.string(period) },
    ),
    listDirectory(`${getConfig().EXPORTS_VOLUME_PATH}/${period}`),
  ]);
  return {
    period,
    approvedCount: pending?.approvedCount ?? 0,
    approvedAmount: pending?.approvedAmount ?? 0,
    files: entries
      .filter((e) => !e.isDirectory && e.name.endsWith(".xlsx"))
      .map((e) => ({
        name: e.name,
        period,
        size: e.fileSize,
        createdAt: e.lastModified ? new Date(e.lastModified).toISOString() : null,
      }))
      .sort((a, b) => b.name.localeCompare(a.name)),
  };
}

/** `period` et `name` sont validés par l'appelant (schémas stricts) : pas de traversée de chemin possible. */
export async function openExportFile(user: CurrentUser, period: string, name: string): Promise<Response> {
  requirePermission(user, "export:run");
  return downloadFile(`${getConfig().EXPORTS_VOLUME_PATH}/${period}/${name}`);
}
