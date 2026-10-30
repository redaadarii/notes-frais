"use client";

import { InboxIcon } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { ReportsTable } from "../components/ReportsTable";
import { StatusFilter } from "../components/StatusFilter";
import { useReports } from "../hooks/use-reports";
import type { ReportStatus } from "../types";

const TEAM_STATUSES: ReportStatus[] = ["SUBMITTED", "MANAGER_APPROVED", "APPROVED", "REJECTED", "EXPORTED"];

function TeamQueue() {
  // Par défaut : ce qui attend une décision du manager
  const [status, setStatus] = useState<ReportStatus | undefined>("SUBMITTED");
  const { data: reports, isPending, error, refetch } = useReports({ scope: "team", status });

  return (
    <>
      <PageHeader title="À valider" description="Notes de frais de votre équipe directe." />
      <div className="mb-4 overflow-x-auto">
        <StatusFilter statuses={TEAM_STATUSES} value={status} onChange={setStatus} />
      </div>
      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Rien à traiter"
          description="Aucune note ne correspond à ce filtre."
        />
      ) : (
        <ReportsTable reports={reports} showEmployee />
      )}
    </>
  );
}

export function ApprovalQueueView() {
  return (
    <RequirePermission permission="report:approve:manager">
      <TeamQueue />
    </RequirePermission>
  );
}
