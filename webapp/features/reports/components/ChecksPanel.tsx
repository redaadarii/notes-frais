import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CHECK_LABELS } from "../labels";
import type { ReportCheck } from "../types";

/** Signaux du job de contrôle : ils n'empêchent rien, ils attirent l'attention du valideur. */
export function ChecksPanel({ checks }: { checks: ReportCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangleIcon />
      <AlertTitle>
        {checks.length} point(s) d&apos;attention relevé(s) par les contrôles automatiques
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {checks.map((check, i) => (
            <li key={`${check.lineId}-${check.rule}-${i}`}>
              <strong>{CHECK_LABELS[check.rule]}</strong> — {check.detail}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
