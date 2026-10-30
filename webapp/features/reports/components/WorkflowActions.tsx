"use client";

import { CheckIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTransition } from "../hooks/use-report-mutations";
import type { ReportDetail } from "../types";
import { ConfirmButton } from "./ConfirmButton";
import { RejectDialog } from "./RejectDialog";

/** Boutons du cycle de vie : uniquement ceux que le SERVEUR déclare possibles (capabilities.actions). */
export function WorkflowActions({ report }: { report: ReportDetail }) {
  const transition = useTransition(report.id);
  const { actions } = report.capabilities;
  if (actions.length === 0) return null;

  const run = (action: "SUBMIT" | "APPROVE" | "REJECT", comment?: string, success?: string) =>
    transition.mutateAsync({ action, comment }).then(() => success && toast.success(success));

  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes("SUBMIT") && (
        <ConfirmButton
          trigger={
            <Button disabled={transition.isPending || report.lineCount === 0}>
              <SendIcon /> Soumettre
            </Button>
          }
          title="Soumettre la note ?"
          description="Elle ne sera plus modifiable, sauf si elle vous est renvoyée."
          confirmLabel="Soumettre"
          onConfirm={() => run("SUBMIT", undefined, "Note soumise pour validation").catch(() => {})}
        />
      )}
      {actions.includes("APPROVE") && (
        <Button
          disabled={transition.isPending}
          onClick={() => run("APPROVE", undefined, "Note validée").catch(() => {})}
        >
          <CheckIcon /> Valider
        </Button>
      )}
      {actions.includes("REJECT") && (
        <RejectDialog
          pending={transition.isPending}
          onReject={(comment) => run("REJECT", comment, "Note rejetée")}
        />
      )}
    </div>
  );
}
