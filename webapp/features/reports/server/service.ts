import "server-only";
import type { CurrentUser } from "@/features/auth/types";
import * as categories from "@/features/categories/server/repository";
import type { RowError } from "@/lib/problem";
import { requirePermission } from "@/server/auth/authorization";
import { getConfig } from "@/server/config";
import { downloadFile, uploadFile } from "@/server/databricks/files";
import { runJob } from "@/server/databricks/jobs";
import { sql } from "@/server/databricks/sql-params";
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import type { LineInput, ReportInput, ReportListQuery, TransitionInput } from "../schemas";
import type { ExpenseLine, ReportDetail, ReportSummary } from "../types";
import { canView, capabilitiesOf, nextStatus } from "../workflow";
import * as repository from "./repository";
import { parseLinesWorkbook } from "./spreadsheet";

/**
 * Cas d'usage des notes de frais. Chaque fonction :
 *   1. vérifie les DROITS de l'utilisateur ;
 *   2. vérifie les RÈGLES métier (workflow.ts) ;
 *   3. délègue l'écriture au repository, puis trace l'événement d'audit.
 */

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export function listReports(
  user: CurrentUser,
  { scope, status, period }: ReportListQuery,
): Promise<ReportSummary[]> {
  const me = { me: sql.string(user.email) };
  switch (scope) {
    case "mine":
      return repository.listReports({ scopeCondition: "r.employee_email = :me", params: me, status, period });
    case "team":
      requirePermission(user, "report:approve:manager");
      return repository.listReports({ scopeCondition: "r.manager_email = :me", params: me, status, period });
    case "finance":
      requirePermission(user, "report:approve:finance");
      return repository.listReports({ scopeCondition: "r.status <> 'DRAFT'", params: {}, status, period });
    case "all":
      requirePermission(user, "report:read:all");
      return repository.listReports({ scopeCondition: "TRUE", params: {}, status, period });
  }
}

/** Note lisible par l'utilisateur, sinon 404 : on ne révèle pas l'existence d'une note d'autrui. */
async function loadVisibleReport(user: CurrentUser, id: string) {
  const report = await repository.findReport(id);
  if (!report || !canView(report, user)) throw new NotFoundError("Note de frais introuvable");
  return report;
}

async function loadEditableReport(user: CurrentUser, id: string) {
  const report = await loadVisibleReport(user, id);
  if (!capabilitiesOf(report, user).canEdit) {
    throw new ConflictError(
      "Cette note n'est plus modifiable (elle a été soumise ou vous n'en êtes pas l'auteur)",
    );
  }
  return report;
}

export async function getReport(user: CurrentUser, id: string): Promise<ReportDetail> {
  const report = await loadVisibleReport(user, id);
  const [lines, events, checks] = await Promise.all([
    repository.listLines(id),
    repository.listEvents(id),
    repository.listChecks(id),
  ]);
  return { ...report, lines, events, checks, capabilities: capabilitiesOf(report, user) };
}

// ---------------------------------------------------------------------------
// En-tête
// ---------------------------------------------------------------------------

function requireActiveEmployee(user: CurrentUser) {
  requirePermission(user, "report:create");
  if (!user.employee?.active) {
    throw new ForbiddenError("Vous n'êtes pas référencé comme collaborateur actif : contactez les RH");
  }
}

export async function createReport(user: CurrentUser, input: ReportInput): Promise<{ id: string }> {
  requireActiveEmployee(user);
  const id = crypto.randomUUID();
  await repository.insertReport(id, user.email, input);
  await repository.insertEvent({ reportId: id, action: "CREATE", actor: user.email, toStatus: "DRAFT" });
  return { id };
}

export async function updateReport(user: CurrentUser, id: string, input: ReportInput): Promise<void> {
  await loadEditableReport(user, id);
  if ((await repository.updateReportHeader(id, input)) === 0)
    throw new ConflictError("La note vient d'être soumise");
}

export async function deleteReport(user: CurrentUser, id: string): Promise<void> {
  const report = await loadVisibleReport(user, id);
  if (!capabilitiesOf(report, user).canDelete)
    throw new ConflictError("Seul un brouillon peut être supprimé");
  if ((await repository.deleteDraft(id)) === 0) throw new ConflictError("La note vient d'être soumise");
}

// ---------------------------------------------------------------------------
// Lignes
// ---------------------------------------------------------------------------

async function requireKnownCategory(code: string) {
  if (!(await categories.findCategory(code))) {
    throw new BusinessRuleError("Catégorie inconnue", { categoryCode: ["Catégorie inconnue"] });
  }
}

export async function addLine(
  user: CurrentUser,
  reportId: string,
  input: LineInput,
): Promise<{ id: string }> {
  await loadEditableReport(user, reportId);
  await requireKnownCategory(input.categoryCode);
  const id = crypto.randomUUID();
  await repository.insertLines(reportId, [{ ...input, id }]);
  await repository.recomputeTotal(reportId);
  return { id };
}

export async function updateLine(
  user: CurrentUser,
  reportId: string,
  lineId: string,
  input: LineInput,
): Promise<void> {
  await loadEditableReport(user, reportId);
  await requireKnownCategory(input.categoryCode);
  if ((await repository.updateLine(reportId, lineId, input)) === 0)
    throw new NotFoundError("Ligne introuvable");
  await repository.recomputeTotal(reportId);
}

export async function deleteLine(user: CurrentUser, reportId: string, lineId: string): Promise<void> {
  await loadEditableReport(user, reportId);
  if ((await repository.deleteLine(reportId, lineId)) === 0) throw new NotFoundError("Ligne introuvable");
  await repository.recomputeTotal(reportId);
}

export type ImportResult = { ok: true; imported: number } | { ok: false; errors: RowError[] };

export async function importLines(user: CurrentUser, reportId: string, file: File): Promise<ImportResult> {
  await loadEditableReport(user, reportId);
  const parsed = await parseLinesWorkbook(await file.arrayBuffer(), await categories.existingCategoryCodes());
  if (!parsed.ok) return parsed;

  await repository.insertLines(
    reportId,
    parsed.lines.map((line) => ({ ...line, id: crypto.randomUUID() })),
  );
  await repository.recomputeTotal(reportId);
  await repository.insertEvent({
    reportId,
    action: "IMPORT",
    actor: user.email,
    comment: `${parsed.lines.length} ligne(s) importée(s) depuis ${file.name}`,
  });
  return { ok: true, imported: parsed.lines.length };
}

// ---------------------------------------------------------------------------
// Justificatifs (volume « receipts »)
// ---------------------------------------------------------------------------

export async function attachReceipt(user: CurrentUser, reportId: string, lineId: string, file: File) {
  await loadEditableReport(user, reportId);
  if (!(await repository.findLine(reportId, lineId))) throw new NotFoundError("Ligne introuvable");

  // Nom unique (jamais d'écrasement) ; le nom d'origine est nettoyé pour rester un chemin sûr.
  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\w.-]/g, "_")
    .slice(-80);
  const path = `${getConfig().RECEIPTS_VOLUME_PATH}/${reportId}/${lineId}/${crypto.randomUUID()}_${safeName}`;
  await uploadFile(path, await file.arrayBuffer());
  await repository.setLineReceipt(reportId, lineId, path);
}

export async function openReceipt(user: CurrentUser, reportId: string, lineId: string) {
  await loadVisibleReport(user, reportId);
  const line = await repository.findLine(reportId, lineId);
  if (!line?.receiptPath) throw new NotFoundError("Aucun justificatif pour cette ligne");
  return { name: line.receiptName!, response: await downloadFile(line.receiptPath) };
}

// ---------------------------------------------------------------------------
// Cycle de vie
// ---------------------------------------------------------------------------

async function assertSubmittable(reportId: string, lines: ExpenseLine[]) {
  if (lines.length === 0) throw new BusinessRuleError("Ajoutez au moins une dépense avant de soumettre");
  const missing = await repository.countLinesMissingReceipt(reportId);
  if (missing > 0) throw new BusinessRuleError(`${missing} dépense(s) sans le justificatif obligatoire`);
}

/** Les contrôles sont un signal pour les valideurs : leur échec ne doit pas bloquer la soumission. */
async function triggerControls(reportId: string) {
  try {
    await runJob(getConfig().CONTROLS_JOB_ID, {});
  } catch (error) {
    console.error(`[controls] déclenchement impossible après la soumission de ${reportId}`, error);
  }
}

export async function transition(
  user: CurrentUser,
  id: string,
  { action, comment }: TransitionInput,
): Promise<ReportDetail> {
  const report = await loadVisibleReport(user, id);
  if (!capabilitiesOf(report, user).actions.includes(action)) {
    throw new ForbiddenError("Cette action n'est pas possible sur cette note, ou pas par vous");
  }

  const managerEmail = action === "SUBMIT" ? (user.employee?.managerEmail ?? null) : report.managerEmail;
  if (action === "SUBMIT") await assertSubmittable(id, await repository.listLines(id));

  const to = nextStatus(report.status, action, managerEmail !== null);
  const updated = await repository.applyTransition({
    id,
    action,
    from: report.status,
    to,
    actor: user.email,
    managerEmail,
    comment,
  });
  if (updated === 0) throw new ConflictError("La note a été modifiée entre-temps : rechargez la page");

  await repository.insertEvent({
    reportId: id,
    action,
    actor: user.email,
    fromStatus: report.status,
    toStatus: to,
    comment:
      comment ??
      (action === "SUBMIT" && !managerEmail ? "Sans manager : transmise directement à la finance" : null),
  });
  console.info(
    JSON.stringify({ event: "report_transition", id, action, from: report.status, to, by: user.email }),
  );

  if (action === "SUBMIT") await triggerControls(id);
  return getReport(user, id);
}
