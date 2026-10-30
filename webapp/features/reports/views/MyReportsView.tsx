"use client";

import { PlusIcon, ReceiptTextIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { ReportsTable } from "../components/ReportsTable";
import { StatusFilter } from "../components/StatusFilter";
import { useReports } from "../hooks/use-reports";
import { REPORT_STATUSES, type ReportStatus } from "../types";

function MyReports() {
  const [status, setStatus] = useState<ReportStatus>();
  const { data: reports, isPending, error, refetch } = useReports({ scope: "mine", status });

  return (
    <>
      <PageHeader
        title="Mes notes de frais"
        description="Créez une note par mois ou par déplacement, ajoutez vos dépenses puis soumettez-la."
        actions={
          <Button asChild>
            <Link href="/reports/new">
              <PlusIcon /> Nouvelle note
            </Link>
          </Button>
        }
      />
      <div className="mb-4 overflow-x-auto">
        <StatusFilter statuses={REPORT_STATUSES} value={status} onChange={setStatus} />
      </div>
      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title={status ? "Aucune note avec ce statut" : "Aucune note de frais"}
          description={status ? undefined : "Commencez par créer votre première note."}
        />
      ) : (
        <ReportsTable reports={reports} />
      )}
    </>
  );
}

export function MyReportsView() {
  return (
    <RequirePermission permission="report:create">
      <MyReports />
    </RequirePermission>
  );
}
