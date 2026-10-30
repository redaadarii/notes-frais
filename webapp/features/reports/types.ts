/** Types du domaine « notes de frais », partagés par l'API et l'écran (aucun code exécuté ici). */

export const REPORT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "MANAGER_APPROVED",
  "APPROVED",
  "REJECTED",
  "EXPORTED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const WORKFLOW_ACTIONS = ["SUBMIT", "APPROVE", "REJECT"] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

/** Ligne d'une liste de notes. */
export interface ReportSummary {
  id: string;
  title: string;
  period: string;
  status: ReportStatus;
  totalAmount: number;
  employeeEmail: string;
  employeeName: string;
  managerEmail: string | null;
  submittedAt: string | null;
  updatedAt: string;
  lineCount: number;
  checkCount: number;
}

export interface ExpenseLine {
  id: string;
  expenseDate: string;
  categoryCode: string;
  categoryLabel: string;
  description: string;
  amount: number;
  hasReceipt: boolean;
  receiptName: string | null;
}

export interface ReportEvent {
  id: string;
  action: string;
  actor: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus | null;
  comment: string | null;
  createdAt: string;
}

/** Anomalie calculée par le job de contrôle. */
export interface ReportCheck {
  lineId: string | null;
  rule: "OVER_LIMIT" | "MISSING_RECEIPT" | "DUPLICATE" | "OUT_OF_PERIOD";
  detail: string;
  checkedAt: string;
}

/** Ce que l'utilisateur courant peut faire sur la note : calculé par le serveur, affiché par l'écran. */
export interface ReportCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  actions: WorkflowAction[];
}

export interface ReportDetail extends ReportSummary {
  createdAt: string;
  rejectionReason: string | null;
  exportBatch: string | null;
  lines: ExpenseLine[];
  events: ReportEvent[];
  checks: ReportCheck[];
  capabilities: ReportCapabilities;
}

/** Vues de liste : mes notes, l'équipe à valider (manager), la file de la finance, tout. */
export const REPORT_SCOPES = ["mine", "team", "finance", "all"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];
