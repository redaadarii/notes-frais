"use client";

import { InboxIcon } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { ReportsTable } from "@/features/reports/components/ReportsTable";
import { StatusFilter } from "@/features/reports/components/StatusFilter";
import { useReports } from "@/features/reports/hooks/use-reports";
import type { ReportStatus } from "@/features/reports/types";
import { ExportPanel } from "../components/ExportPanel";

const FINANCE_STATUSES: ReportStatus[] = [
  "MANAGER_APPROVED",
  "APPROVED",
  "EXPORTED",
  "SUBMITTED",
  "REJECTED",
];

function FinanceQueue() {
  const [status, setStatus] = useState<ReportStatus | undefined>("MANAGER_APPROVED");
  const { data: reports, isPending, error, refetch } = useReports({ scope: "finance", status });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <StatusFilter statuses={FINANCE_STATUSES} value={status} onChange={setStatus} />
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
    </div>
  );
}

function Finance() {
  return (
    <>
      <PageHeader title="Finance" description="Second niveau de validation et export comptable mensuel." />
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Notes</TabsTrigger>
          <TabsTrigger value="exports">Exports comptables</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <FinanceQueue />
        </TabsContent>
        <TabsContent value="exports" className="mt-4">
          <ExportPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}

export function FinanceView() {
  return (
    <RequirePermission permission="report:approve:finance">
      <Finance />
    </RequirePermission>
  );
}
