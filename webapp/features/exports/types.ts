import type { RunStatus } from "@/server/databricks/jobs";

export type { RunStatus };

export interface ExportRun {
  runId: number;
  status: RunStatus;
  period: string;
  requestedBy: string;
  startedAt: string | null;
  endedAt: string | null;
  message: string | null;
}

export interface ExportFile {
  name: string;
  period: string;
  size: number | null;
  createdAt: string | null;
}

export interface PeriodExportStatus {
  period: string;
  /** Notes validées en attente d'export pour la période. */
  approvedCount: number;
  approvedAmount: number;
  files: ExportFile[];
}
