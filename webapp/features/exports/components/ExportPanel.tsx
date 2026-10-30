"use client";

import { FileSpreadsheetIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PeriodSelect } from "@/components/forms/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatFileSize, formatMoney, recentPeriods } from "@/lib/format";
import { useExportRuns, usePeriodExport, useStartExport } from "../hooks/use-exports";
import { ExportRunsTable } from "./ExportRunsTable";

export function ExportPanel() {
  // Par défaut : le mois précédent, celui que l'on clôture
  const [period, setPeriod] = useState(() => recentPeriods(2)[1]!);
  const { data: status, isPending, error, refetch } = usePeriodExport(period);
  const { data: runs = [] } = useExportRuns();
  const startExport = useStartExport();
  const exportRunning = runs.some((r) => r.status === "PENDING" || r.status === "RUNNING");

  const handleStart = () =>
    startExport.mutate(period, {
      onSuccess: () => toast.success("Export lancé : le fichier sera prêt dans quelques instants"),
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export comptable</CardTitle>
          <CardDescription>
            Génère un classeur Excel des notes validées du mois, puis les passe au statut « Exportée ».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="export-period">Période</Label>
            <PeriodSelect id="export-period" value={period} onChange={setPeriod} />
          </div>

          {isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <>
              <p className="text-sm">
                <strong>{status.approvedCount}</strong> note(s) validée(s) en attente d&apos;export, pour{" "}
                <strong>{formatMoney(status.approvedAmount)}</strong>.
              </p>
              <Button
                onClick={handleStart}
                disabled={status.approvedCount === 0 || exportRunning || startExport.isPending}
              >
                <PlayIcon /> {exportRunning ? "Export en cours…" : "Lancer l'export"}
              </Button>

              <div>
                <h3 className="mb-2 text-sm font-medium">Fichiers produits</h3>
                {status.files.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucun fichier pour cette période.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {status.files.map((file) => (
                      <li key={file.name} className="flex items-center justify-between gap-2 p-3 text-sm">
                        <a
                          href={`/api/v1/exports/periods/${file.period}/files/${file.name}`}
                          className="text-primary flex items-center gap-2 font-medium hover:underline"
                        >
                          <FileSpreadsheetIcon className="size-4" aria-hidden />
                          {file.name}
                        </a>
                        <span className="text-muted-foreground">
                          {file.size !== null && formatFileSize(file.size)}
                          {file.createdAt && ` · ${formatDateTime(file.createdAt)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers exports</CardTitle>
          <CardDescription>
            Exécutions du job Databricks, actualisées automatiquement pendant un export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportRunsTable />
        </CardContent>
      </Card>
    </div>
  );
}
