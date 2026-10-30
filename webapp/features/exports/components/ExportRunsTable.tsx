"use client";

import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { useExportRuns } from "../hooks/use-exports";
import { RunStatusBadge } from "./RunStatusBadge";

export function ExportRunsTable() {
  const { data: runs, isPending, error, refetch } = useExportRuns();

  if (isPending) return <TableSkeleton rows={3} />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (runs.length === 0)
    return <p className="text-muted-foreground text-sm">Aucun export lancé pour l&apos;instant.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Période</TableHead>
          <TableHead>Lancé par</TableHead>
          <TableHead>Début</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.runId}>
            <TableCell>{run.period}</TableCell>
            <TableCell className="text-muted-foreground">{run.requestedBy}</TableCell>
            <TableCell className="text-muted-foreground">
              {run.startedAt ? formatDateTime(run.startedAt) : "—"}
            </TableCell>
            <TableCell>
              <RunStatusBadge status={run.status} />
              {run.message && <p className="text-destructive mt-1 max-w-xs text-xs">{run.message}</p>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
