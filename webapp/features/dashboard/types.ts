import type { ReportStatus } from "@/features/reports/types";

export interface StatusCount {
  status: ReportStatus;
  count: number;
  amount: number;
}

/** Tableau de bord : chaque bloc n'est présent que si l'utilisateur a le rôle correspondant. */
export interface Dashboard {
  mine: StatusCount[] | null;
  team: { pendingCount: number; pendingAmount: number } | null;
  finance: {
    pendingCount: number;
    pendingAmount: number;
    toExportCount: number;
    toExportAmount: number;
  } | null;
}
