import type { ReportCheck, ReportStatus, WorkflowAction } from "./types";

export const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  MANAGER_APPROVED: "Validée manager",
  APPROVED: "Validée",
  REJECTED: "Rejetée",
  EXPORTED: "Exportée",
};

/** Couleur par statut : classes Tailwind complètes (jamais construites dynamiquement, sinon purgées). */
export const STATUS_STYLES: Record<ReportStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  MANAGER_APPROVED: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  EXPORTED: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
};

export const ACTION_LABELS: Record<WorkflowAction | "CREATE" | "IMPORT" | "EXPORT", string> = {
  CREATE: "Création",
  IMPORT: "Import Excel",
  SUBMIT: "Soumission",
  APPROVE: "Validation",
  REJECT: "Rejet",
  EXPORT: "Export comptable",
};

export const CHECK_LABELS: Record<ReportCheck["rule"], string> = {
  OVER_LIMIT: "Plafond dépassé",
  MISSING_RECEIPT: "Justificatif manquant",
  DUPLICATE: "Doublon possible",
  OUT_OF_PERIOD: "Hors période",
};
