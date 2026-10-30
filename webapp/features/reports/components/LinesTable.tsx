"use client";

import { AlertTriangleIcon, PaperclipIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatMoney } from "@/lib/format";
import { useDeleteLine } from "../hooks/use-report-mutations";
import type { ExpenseLine, ReportCheck } from "../types";
import { ConfirmButton } from "./ConfirmButton";

interface LinesTableProps {
  reportId: string;
  lines: ExpenseLine[];
  checks: ReportCheck[];
  totalAmount: number;
  editable: boolean;
  onEdit: (line: ExpenseLine) => void;
}

export function LinesTable({ reportId, lines, checks, totalAmount, editable, onEdit }: LinesTableProps) {
  const deleteLine = useDeleteLine(reportId);

  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Justificatif</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            {editable && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const lineChecks = checks.filter((c) => c.lineId === line.id);
            return (
              <TableRow key={line.id}>
                <TableCell className="whitespace-nowrap">{formatDate(line.expenseDate)}</TableCell>
                <TableCell>{line.categoryLabel}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {line.description}
                    {lineChecks.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangleIcon
                            className="size-4 shrink-0 text-amber-600"
                            aria-label="Anomalie"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{lineChecks.map((c) => c.detail).join(" · ")}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {line.hasReceipt ? (
                    <a
                      href={`/api/v1/reports/${reportId}/lines/${line.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex max-w-40 items-center gap-1 text-sm hover:underline"
                    >
                      <PaperclipIcon className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{line.receiptName}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(line.amount)}</TableCell>
                {editable && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label="Modifier" onClick={() => onEdit(line)}>
                      <PencilIcon />
                    </Button>
                    <ConfirmButton
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Supprimer"
                          disabled={deleteLine.isPending}
                        >
                          <Trash2Icon />
                        </Button>
                      }
                      title="Supprimer cette dépense ?"
                      description={`${line.description} — ${formatMoney(line.amount)}`}
                      confirmLabel="Supprimer"
                      onConfirm={() => deleteLine.mutate(line.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatMoney(totalAmount)}
            </TableCell>
            {editable && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
