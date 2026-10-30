"use client";

import {
  CheckCheckIcon,
  FileOutputIcon,
  FilePenLineIcon,
  HourglassIcon,
  LandmarkIcon,
  XCircleIcon,
} from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { ReportStatus } from "@/features/reports/types";
import { formatMoney } from "@/lib/format";
import { StatCard } from "../components/StatCard";
import { useDashboard } from "../hooks/use-dashboard";
import type { StatusCount } from "../types";

function sum(counts: StatusCount[], statuses: ReportStatus[]) {
  const selected = counts.filter((c) => statuses.includes(c.status));
  return {
    count: selected.reduce((total, c) => total + c.count, 0),
    amount: selected.reduce((total, c) => total + c.amount, 0),
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export function DashboardView() {
  const { data: user } = useCurrentUser();
  const { data: dashboard, isPending, error, refetch } = useDashboard();

  return (
    <>
      <PageHeader
        title={`Bonjour ${user?.displayName.split(" ")[0] ?? ""}`}
        description="Vos notes de frais en un coup d'œil."
      />
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-8">
          {dashboard.mine && (
            <Section title="Mes notes">
              {(
                [
                  ["Brouillons", ["DRAFT"], FilePenLineIcon],
                  ["En validation", ["SUBMITTED", "MANAGER_APPROVED"], HourglassIcon],
                  ["À corriger", ["REJECTED"], XCircleIcon],
                  ["Validées", ["APPROVED", "EXPORTED"], CheckCheckIcon],
                ] as const
              ).map(([title, statuses, icon]) => {
                const { count, amount } = sum(dashboard.mine!, [...statuses]);
                return (
                  <StatCard
                    key={title}
                    title={title}
                    value={String(count)}
                    detail={formatMoney(amount)}
                    icon={icon}
                    href="/reports"
                  />
                );
              })}
            </Section>
          )}
          {(dashboard.team || dashboard.finance) && (
            <Section title="Validation">
              {dashboard.team && (
                <StatCard
                  title="Équipe : à valider"
                  value={String(dashboard.team.pendingCount)}
                  detail={formatMoney(dashboard.team.pendingAmount)}
                  icon={CheckCheckIcon}
                  href="/approvals"
                />
              )}
              {dashboard.finance && (
                <>
                  <StatCard
                    title="Finance : à valider"
                    value={String(dashboard.finance.pendingCount)}
                    detail={formatMoney(dashboard.finance.pendingAmount)}
                    icon={LandmarkIcon}
                    href="/finance"
                  />
                  <StatCard
                    title="À exporter"
                    value={String(dashboard.finance.toExportCount)}
                    detail={formatMoney(dashboard.finance.toExportAmount)}
                    icon={FileOutputIcon}
                    href="/finance"
                  />
                </>
              )}
            </Section>
          )}
        </div>
      )}
    </>
  );
}
