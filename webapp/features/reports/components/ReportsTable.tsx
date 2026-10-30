import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatMoney, formatPeriod } from "@/lib/format";
import type { ReportSummary } from "../types";
import { StatusBadge } from "./StatusBadge";

interface ReportsTableProps {
  reports: ReportSummary[];
  /** Vues manager et finance : on affiche l'auteur de chaque note. */
  showEmployee?: boolean;
}

export function ReportsTable({ reports, showEmployee = false }: ReportsTableProps) {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Note</TableHead>
            {showEmployee && <TableHead>Collaborateur</TableHead>}
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="hidden lg:table-cell">Mise à jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                <Link href={`/reports/${report.id}`} className="font-medium hover:underline">
                  {report.title}
                </Link>
                <p className="text-muted-foreground text-xs">{report.lineCount} dépense(s)</p>
              </TableCell>
              {showEmployee && <TableCell>{report.employeeName}</TableCell>}
              <TableCell className="capitalize">{formatPeriod(report.period)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                  {report.checkCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangleIcon
                          className="size-4 text-amber-600"
                          aria-label={`${report.checkCount} anomalie(s)`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {report.checkCount} anomalie(s) détectée(s) par les contrôles
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(report.totalAmount)}</TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {formatDateTime(report.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
