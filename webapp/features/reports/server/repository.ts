import "server-only";
import { executeUpdate, query, queryOne } from "@/server/databricks/sql";
import { sql, type SqlParams } from "@/server/databricks/sql-params";
import type {
  ExpenseLine,
  ReportCheck,
  ReportEvent,
  ReportStatus,
  ReportSummary,
  WorkflowAction,
} from "../types";
import type { LineInput, ReportInput } from "../schemas";

/**
 * Accès aux tables des notes de frais. AUCUNE règle métier ici : uniquement du SQL paramétré.
 * Les noms de colonnes sont renommés en camelCase dans le SELECT, pour coller aux types TypeScript.
 */

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

const SUMMARY_SELECT = `
  SELECT r.id, r.title, r.period, r.status, r.total_amount AS totalAmount,
         r.employee_email AS employeeEmail, coalesce(e.full_name, r.employee_email) AS employeeName,
         r.manager_email AS managerEmail, r.submitted_at AS submittedAt, r.updated_at AS updatedAt,
         r.created_at AS createdAt, r.rejection_reason AS rejectionReason, r.export_batch AS exportBatch,
         coalesce(lc.n, 0) AS lineCount, coalesce(cc.n, 0) AS checkCount
  FROM expense_reports r
  LEFT JOIN employees e ON e.email = r.employee_email
  LEFT JOIN (SELECT report_id, COUNT(*) AS n FROM expense_lines GROUP BY report_id) lc ON lc.report_id = r.id
  LEFT JOIN (SELECT report_id, COUNT(*) AS n FROM report_checks GROUP BY report_id) cc ON cc.report_id = r.id`;

export interface ReportRow extends ReportSummary {
  createdAt: string;
  rejectionReason: string | null;
  exportBatch: string | null;
}

/** Filtres de liste ; `scopeCondition` est un fragment SQL FIXE choisi par le service, jamais saisi. */
export interface ReportFilter {
  scopeCondition: string;
  params: SqlParams;
  status?: ReportStatus;
  period?: string;
}

export function listReports({ scopeCondition, params, status, period }: ReportFilter): Promise<ReportRow[]> {
  return query<ReportRow>(
    `${SUMMARY_SELECT}
     WHERE ${scopeCondition}
       AND (:status IS NULL OR r.status = :status)
       AND (:period IS NULL OR r.period = :period)
     ORDER BY r.updated_at DESC
     LIMIT 500`,
    { ...params, status: sql.string(status), period: sql.string(period) },
  );
}

export function findReport(id: string): Promise<ReportRow | null> {
  return queryOne<ReportRow>(`${SUMMARY_SELECT} WHERE r.id = :id`, { id: sql.string(id) });
}

interface LineRow extends Omit<ExpenseLine, "hasReceipt" | "receiptName"> {
  receiptPath: string | null;
}

/** « …/<uuid>_facture.pdf » → « facture.pdf » */
const receiptNameOf = (path: string) =>
  path
    .split("/")
    .pop()!
    .replace(/^[0-9a-f-]{36}_/, "");

const toLine = ({ receiptPath, ...line }: LineRow): ExpenseLine => ({
  ...line,
  hasReceipt: receiptPath !== null,
  receiptName: receiptPath ? receiptNameOf(receiptPath) : null,
});

const LINE_SELECT = `
  SELECT l.id, CAST(l.expense_date AS STRING) AS expenseDate, l.category_code AS categoryCode,
         coalesce(c.label, l.category_code) AS categoryLabel, l.description, l.amount,
         l.receipt_path AS receiptPath
  FROM expense_lines l
  LEFT JOIN categories c ON c.code = l.category_code`;

export async function listLines(reportId: string): Promise<ExpenseLine[]> {
  const rows = await query<LineRow>(
    `${LINE_SELECT} WHERE l.report_id = :reportId ORDER BY l.expense_date, l.created_at`,
    {
      reportId: sql.string(reportId),
    },
  );
  return rows.map(toLine);
}

export async function findLine(reportId: string, lineId: string) {
  const row = await queryOne<LineRow>(`${LINE_SELECT} WHERE l.report_id = :reportId AND l.id = :lineId`, {
    reportId: sql.string(reportId),
    lineId: sql.string(lineId),
  });
  return row ? { ...toLine(row), receiptPath: row.receiptPath } : null;
}

export function listEvents(reportId: string): Promise<ReportEvent[]> {
  return query<ReportEvent>(
    `SELECT id, action, actor, from_status AS fromStatus, to_status AS toStatus, comment, created_at AS createdAt
     FROM report_events WHERE report_id = :reportId ORDER BY created_at DESC`,
    { reportId: sql.string(reportId) },
  );
}

export function listChecks(reportId: string): Promise<ReportCheck[]> {
  return query<ReportCheck>(
    `SELECT line_id AS lineId, rule, detail, checked_at AS checkedAt
     FROM report_checks WHERE report_id = :reportId ORDER BY rule`,
    { reportId: sql.string(reportId) },
  );
}

/** Lignes dont la catégorie exige un justificatif et qui n'en ont pas. */
export async function countLinesMissingReceipt(reportId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM expense_lines l JOIN categories c ON c.code = l.category_code
     WHERE l.report_id = :reportId AND c.receipt_required AND l.receipt_path IS NULL`,
    { reportId: sql.string(reportId) },
  );
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Écriture : en-tête
// ---------------------------------------------------------------------------

export async function insertReport(id: string, employeeEmail: string, input: ReportInput): Promise<void> {
  await executeUpdate(
    `INSERT INTO expense_reports (id, employee_email, title, period, status, total_amount, created_at, updated_at)
     VALUES (:id, :employeeEmail, :title, :period, 'DRAFT', 0, current_timestamp(), current_timestamp())`,
    {
      id: sql.string(id),
      employeeEmail: sql.string(employeeEmail),
      title: sql.string(input.title),
      period: sql.string(input.period),
    },
  );
}

export function updateReportHeader(id: string, input: ReportInput): Promise<number> {
  return executeUpdate(
    `UPDATE expense_reports SET title = :title, period = :period, updated_at = current_timestamp()
     WHERE id = :id AND status IN ('DRAFT', 'REJECTED')`,
    { id: sql.string(id), title: sql.string(input.title), period: sql.string(input.period) },
  );
}

/** Suppression d'un brouillon : enfants d'abord (les clés étrangères Delta sont informatives, non appliquées). */
export async function deleteDraft(id: string): Promise<number> {
  const params = { id: sql.string(id) };
  const deleted = await executeUpdate(
    `DELETE FROM expense_reports WHERE id = :id AND status = 'DRAFT'`,
    params,
  );
  if (deleted > 0) {
    await executeUpdate(`DELETE FROM expense_lines WHERE report_id = :id`, params);
    await executeUpdate(`DELETE FROM report_events WHERE report_id = :id`, params);
  }
  return deleted;
}

/** Total recalculé EN BASE à partir des lignes : jamais transmis par l'écran. */
export async function recomputeTotal(reportId: string): Promise<void> {
  await executeUpdate(
    `MERGE INTO expense_reports AS r
     USING (SELECT :reportId AS id, coalesce(SUM(amount), 0) AS total FROM expense_lines WHERE report_id = :reportId) AS s
     ON r.id = s.id
     WHEN MATCHED THEN UPDATE SET total_amount = s.total, updated_at = current_timestamp()`,
    { reportId: sql.string(reportId) },
  );
}

// ---------------------------------------------------------------------------
// Écriture : lignes
// ---------------------------------------------------------------------------

export interface NewLine extends LineInput {
  id: string;
}

/** Insertion groupée en UNE requête : un import Excel est entièrement accepté ou entièrement refusé. */
export async function insertLines(reportId: string, lines: NewLine[]): Promise<void> {
  if (lines.length === 0) return;
  const params: SqlParams = { reportId: sql.string(reportId) };
  const values = lines.map((line, i) => {
    params[`id${i}`] = sql.string(line.id);
    params[`date${i}`] = sql.date(line.expenseDate);
    params[`category${i}`] = sql.string(line.categoryCode);
    params[`description${i}`] = sql.string(line.description);
    params[`amount${i}`] = sql.money(line.amount);
    return `(:id${i}, :reportId, :date${i}, :category${i}, :description${i}, :amount${i}, NULL, current_timestamp())`;
  });
  await executeUpdate(
    `INSERT INTO expense_lines (id, report_id, expense_date, category_code, description, amount, receipt_path, created_at)
     VALUES ${values.join(", ")}`,
    params,
  );
}

export function updateLine(reportId: string, lineId: string, input: LineInput): Promise<number> {
  return executeUpdate(
    `UPDATE expense_lines
     SET expense_date = :date, category_code = :category, description = :description, amount = :amount
     WHERE report_id = :reportId AND id = :lineId`,
    {
      reportId: sql.string(reportId),
      lineId: sql.string(lineId),
      date: sql.date(input.expenseDate),
      category: sql.string(input.categoryCode),
      description: sql.string(input.description),
      amount: sql.money(input.amount),
    },
  );
}

export function deleteLine(reportId: string, lineId: string): Promise<number> {
  return executeUpdate(`DELETE FROM expense_lines WHERE report_id = :reportId AND id = :lineId`, {
    reportId: sql.string(reportId),
    lineId: sql.string(lineId),
  });
}

export function setLineReceipt(reportId: string, lineId: string, receiptPath: string): Promise<number> {
  return executeUpdate(
    `UPDATE expense_lines SET receipt_path = :path WHERE report_id = :reportId AND id = :lineId`,
    {
      reportId: sql.string(reportId),
      lineId: sql.string(lineId),
      path: sql.string(receiptPath),
    },
  );
}

// ---------------------------------------------------------------------------
// Écriture : cycle de vie
// ---------------------------------------------------------------------------

export interface TransitionCommand {
  id: string;
  action: WorkflowAction;
  from: ReportStatus;
  to: ReportStatus;
  actor: string;
  /** SUBMIT : manager figé au moment de la soumission. */
  managerEmail?: string | null;
  comment?: string;
}

/** Colonnes mises à jour selon la transition : fragments FIXES, aucune donnée saisie dans le texte SQL. */
function assignmentsFor({ action, from }: TransitionCommand): string[] {
  const decidedBy = from === "SUBMITTED" ? "manager" : "finance";
  switch (action) {
    case "SUBMIT":
      return [
        "submitted_at = current_timestamp()",
        "manager_email = :managerEmail",
        "rejection_reason = NULL",
        "manager_decision_by = NULL",
        "manager_decision_at = NULL",
        "finance_decision_by = NULL",
        "finance_decision_at = NULL",
      ];
    case "APPROVE":
      return [`${decidedBy}_decision_by = :actor`, `${decidedBy}_decision_at = current_timestamp()`];
    case "REJECT":
      return [
        `${decidedBy}_decision_by = :actor`,
        `${decidedBy}_decision_at = current_timestamp()`,
        "rejection_reason = :comment",
      ];
  }
}

/**
 * Verrou optimiste : « WHERE status = :from ». Si quelqu'un a changé le statut entre-temps,
 * aucune ligne n'est modifiée et l'appelant le sait (0 renvoyé).
 */
export function applyTransition(command: TransitionCommand): Promise<number> {
  const assignments = ["status = :to", "updated_at = current_timestamp()", ...assignmentsFor(command)];
  return executeUpdate(
    `UPDATE expense_reports SET ${assignments.join(", ")} WHERE id = :id AND status = :from`,
    {
      id: sql.string(command.id),
      from: sql.string(command.from),
      to: sql.string(command.to),
      actor: sql.string(command.actor),
      managerEmail: sql.string(command.managerEmail),
      comment: sql.string(command.comment),
    },
  );
}

export interface NewEvent {
  reportId: string;
  action: string;
  actor: string;
  fromStatus?: ReportStatus | null;
  toStatus?: ReportStatus | null;
  comment?: string | null;
}

export async function insertEvent(event: NewEvent): Promise<void> {
  await executeUpdate(
    `INSERT INTO report_events (id, report_id, action, actor, from_status, to_status, comment, created_at)
     VALUES (:id, :reportId, :action, :actor, :fromStatus, :toStatus, :comment, current_timestamp())`,
    {
      id: sql.string(crypto.randomUUID()),
      reportId: sql.string(event.reportId),
      action: sql.string(event.action),
      actor: sql.string(event.actor),
      fromStatus: sql.string(event.fromStatus),
      toStatus: sql.string(event.toStatus),
      comment: sql.string(event.comment),
    },
  );
}
