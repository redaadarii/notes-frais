"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABELS } from "../labels";
import type { ReportStatus } from "../types";

const ALL = "ALL";

interface StatusFilterProps {
  statuses: readonly ReportStatus[];
  value: ReportStatus | undefined;
  onChange: (status: ReportStatus | undefined) => void;
  allLabel?: string;
}

export function StatusFilter({ statuses, value, onChange, allLabel = "Toutes" }: StatusFilterProps) {
  return (
    <Tabs value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : (v as ReportStatus))}>
      <TabsList className="flex-wrap">
        <TabsTrigger value={ALL}>{allLabel}</TabsTrigger>
        {statuses.map((status) => (
          <TabsTrigger key={status} value={status}>
            {STATUS_LABELS[status]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
