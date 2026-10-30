import type { Permission } from "@/features/auth/roles";
import type { ReportCapabilities, ReportStatus, WorkflowAction } from "./types";

/**
 * Cycle de vie d'une note de frais. Module PUR : toutes les règles de transition sont ici,
 * testées unitairement, et utilisées par le service (qui les impose) et par l'API (qui les expose).
 *
 *   DRAFT ──SUBMIT──▶ SUBMITTED ──APPROVE (manager)──▶ MANAGER_APPROVED ──APPROVE (finance)──▶ APPROVED ──export──▶ EXPORTED
 *     ▲                   │                                   │
 *     │                REJECT                              REJECT
 *     │                   ▼                                   ▼
 *     └──(corrigée puis SUBMIT)───────────── REJECTED ◀───────┘
 */

export const EDITABLE_STATUSES: readonly ReportStatus[] = ["DRAFT", "REJECTED"];

export interface WorkflowReport {
  status: ReportStatus;
  employeeEmail: string;
  /** Manager figé à la soumission ; null tant que la note n'a pas été soumise. */
  managerEmail: string | null;
}

export interface WorkflowUser {
  email: string;
  permissions: readonly Permission[];
}

const isOwner = (report: WorkflowReport, user: WorkflowUser) => report.employeeEmail === user.email;

/** Qui peut décider à l'étape courante ? Jamais l'auteur de la note (séparation des tâches). */
function isCurrentApprover(report: WorkflowReport, user: WorkflowUser): boolean {
  if (isOwner(report, user)) return false;
  switch (report.status) {
    case "SUBMITTED":
      return user.permissions.includes("report:approve:manager") && report.managerEmail === user.email;
    case "MANAGER_APPROVED":
      return user.permissions.includes("report:approve:finance");
    default:
      return false;
  }
}

export function allowedActions(report: WorkflowReport, user: WorkflowUser): WorkflowAction[] {
  if (isOwner(report, user) && EDITABLE_STATUSES.includes(report.status)) return ["SUBMIT"];
  if (isCurrentApprover(report, user)) return ["APPROVE", "REJECT"];
  return [];
}

export function capabilitiesOf(report: WorkflowReport, user: WorkflowUser): ReportCapabilities {
  const canEdit = isOwner(report, user) && EDITABLE_STATUSES.includes(report.status);
  return {
    canEdit,
    canDelete: isOwner(report, user) && report.status === "DRAFT",
    actions: allowedActions(report, user),
  };
}

/** Lecture : l'auteur, son manager (une fois soumise), ou un profil habilité à tout voir. */
export function canView(report: WorkflowReport, user: WorkflowUser): boolean {
  return (
    isOwner(report, user) ||
    (report.managerEmail !== null && report.managerEmail === user.email) ||
    user.permissions.includes("report:read:all")
  );
}

/**
 * Statut d'arrivée d'une transition AUTORISÉE.
 * Un collaborateur sans manager (sommet de la hiérarchie) passe directement à la validation finance.
 */
export function nextStatus(current: ReportStatus, action: WorkflowAction, hasManager: boolean): ReportStatus {
  switch (action) {
    case "SUBMIT":
      return hasManager ? "SUBMITTED" : "MANAGER_APPROVED";
    case "APPROVE":
      if (current === "SUBMITTED") return "MANAGER_APPROVED";
      if (current === "MANAGER_APPROVED") return "APPROVED";
      break;
    case "REJECT":
      if (current === "SUBMITTED" || current === "MANAGER_APPROVED") return "REJECTED";
      break;
  }
  throw new Error(`Transition impossible : ${action} depuis ${current}`);
}
