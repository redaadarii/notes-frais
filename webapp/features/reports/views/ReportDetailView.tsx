"use client";

import { ArrowLeftIcon, PlusIcon, ReceiptTextIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChecksPanel } from "../components/ChecksPanel";
import { ImportLinesDialog } from "../components/ImportLinesDialog";
import { LineFormDialog } from "../components/LineFormDialog";
import { LinesTable } from "../components/LinesTable";
import { ReportHeaderCard } from "../components/ReportHeaderCard";
import { Timeline } from "../components/Timeline";
import { useReport } from "../hooks/use-reports";
import type { ExpenseLine } from "../types";

/** Date proposée pour une nouvelle dépense : aujourd'hui si on est dans le mois de la note, sinon le 1er. */
function defaultExpenseDate(period: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(period) ? today : `${period}-01`;
}

export function ReportDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: report, isPending, error, refetch } = useReport(id);
  // undefined : fermé ; null : nouvelle ligne ; sinon la ligne en cours de modification
  const [editedLine, setEditedLine] = useState<ExpenseLine | null>();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <TableSkeleton rows={3} />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const { canEdit } = report.capabilities;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeftIcon /> Retour
      </Button>

      <ReportHeaderCard report={report} />
      <ChecksPanel checks={report.checks} />

      <section aria-labelledby="lines-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="lines-title" className="text-lg font-semibold">
            Dépenses
          </h2>
          {canEdit && (
            <div className="flex gap-2">
              <ImportLinesDialog reportId={report.id} />
              <Button onClick={() => setEditedLine(null)}>
                <PlusIcon /> Ajouter une dépense
              </Button>
            </div>
          )}
        </div>
        {report.lines.length === 0 ? (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Aucune dépense"
            description={
              canEdit ? "Ajoutez vos dépenses une par une, ou importez-les depuis Excel." : undefined
            }
          />
        ) : (
          <LinesTable
            reportId={report.id}
            lines={report.lines}
            checks={report.checks}
            totalAmount={report.totalAmount}
            editable={canEdit}
            onEdit={setEditedLine}
          />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline events={report.events} />
        </CardContent>
      </Card>

      <LineFormDialog
        reportId={report.id}
        line={editedLine ?? undefined}
        defaultDate={defaultExpenseDate(report.period)}
        open={editedLine !== undefined}
        onOpenChange={(open) => !open && setEditedLine(undefined)}
      />
    </div>
  );
}
