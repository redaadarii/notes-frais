import { Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RunStatus } from "../types";

const LABELS: Record<RunStatus, string> = {
  PENDING: "En file d'attente",
  RUNNING: "En cours",
  SUCCEEDED: "Terminé",
  FAILED: "Échec",
  CANCELED: "Annulé",
};

const STYLES: Record<RunStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  RUNNING: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  SUCCEEDED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  FAILED: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  CANCELED: "bg-muted text-muted-foreground",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const active = status === "PENDING" || status === "RUNNING";
  return (
    <Badge className={cn("border-transparent", STYLES[status])}>
      {active && <Loader2Icon className="animate-spin" aria-hidden />}
      {LABELS[status]}
    </Badge>
  );
}
