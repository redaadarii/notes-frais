"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, formatMoney, formatPeriod } from "@/lib/format";
import { useDeleteReport, useUpdateReport } from "../hooks/use-report-mutations";
import type { ReportDetail } from "../types";
import { ConfirmButton } from "./ConfirmButton";
import { ReportForm } from "./ReportForm";
import { StatusBadge } from "./StatusBadge";
import { WorkflowActions } from "./WorkflowActions";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function ReportHeaderCard({ report }: { report: ReportDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const updateReport = useUpdateReport(report.id);
  const deleteReport = useDeleteReport();

  const handleDelete = () =>
    deleteReport.mutate(report.id, {
      onSuccess: () => {
        toast.success("Brouillon supprimé");
        router.push("/reports");
      },
    });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">{report.title}</CardTitle>
            <StatusBadge status={report.status} />
          </div>
          <CardDescription>
            {report.employeeName} · <span className="capitalize">{formatPeriod(report.period)}</span>
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.capabilities.canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon /> Modifier
            </Button>
          )}
          {report.capabilities.canDelete && (
            <ConfirmButton
              trigger={
                <Button variant="outline" disabled={deleteReport.isPending}>
                  <Trash2Icon /> Supprimer
                </Button>
              }
              title="Supprimer ce brouillon ?"
              description="La note et toutes ses dépenses seront définitivement supprimées."
              confirmLabel="Supprimer"
              onConfirm={handleDelete}
            />
          )}
          <WorkflowActions report={report} />
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Total">{formatMoney(report.totalAmount)}</Fact>
          <Fact label="Dépenses">{report.lineCount}</Fact>
          <Fact label="Soumise le">{report.submittedAt ? formatDateTime(report.submittedAt) : "—"}</Fact>
          <Fact label="Lot d'export">{report.exportBatch ?? "—"}</Fact>
        </dl>
        {report.status === "REJECTED" && report.rejectionReason && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
            <strong>Motif du rejet :</strong> {report.rejectionReason}
          </p>
        )}
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la note</DialogTitle>
          </DialogHeader>
          {editing && (
            <ReportForm
              initialValues={{ title: report.title, period: report.period }}
              submitLabel="Enregistrer"
              pending={updateReport.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={(input) => updateReport.mutateAsync(input).then(() => setEditing(false))}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
