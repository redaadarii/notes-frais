import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES } from "../labels";
import type { ReportStatus } from "../types";

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Badge className={cn("border-transparent", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}
