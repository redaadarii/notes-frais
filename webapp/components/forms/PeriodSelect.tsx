"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriod, recentPeriods } from "@/lib/format";

interface PeriodSelectProps {
  value: string;
  onChange: (period: string) => void;
  months?: number;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function PeriodSelect({ value, onChange, months = 12, ...aria }: PeriodSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full capitalize" {...aria}>
        <SelectValue placeholder="Choisir un mois" />
      </SelectTrigger>
      <SelectContent>
        {recentPeriods(months).map((period) => (
          <SelectItem key={period} value={period} className="capitalize">
            {formatPeriod(period)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
