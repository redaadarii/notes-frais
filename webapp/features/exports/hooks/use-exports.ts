"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportKeys } from "@/features/reports/hooks/query-keys";
import { dashboardKey } from "@/features/dashboard/hooks/use-dashboard";
import { api } from "@/lib/api-client";
import type { ExportRun, PeriodExportStatus } from "../types";

export const exportKeys = {
  runs: ["exports", "runs"] as const,
  period: (period: string) => ["exports", "period", period] as const,
};

const isRunning = (run: ExportRun) => run.status === "PENDING" || run.status === "RUNNING";

/** Tant qu'un export tourne, la liste est rafraîchie toutes les 5 s ; ensuite, plus aucun appel. */
export function useExportRuns() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: exportKeys.runs,
    queryFn: async ({ signal }) => {
      const runs = await api.get<ExportRun[]>("/exports", signal);
      const previous = queryClient.getQueryData<ExportRun[]>(exportKeys.runs);
      // Un export vient de se terminer : statuts des notes et fichiers disponibles ont changé.
      if (previous?.some(isRunning) && !runs.some(isRunning)) {
        queryClient.invalidateQueries({ queryKey: ["exports", "period"] });
        queryClient.invalidateQueries({ queryKey: reportKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardKey });
      }
      return runs;
    },
    refetchInterval: (query) => (query.state.data?.some(isRunning) ? 5_000 : false),
  });
}

export function usePeriodExport(period: string) {
  return useQuery({
    queryKey: exportKeys.period(period),
    queryFn: ({ signal }) => api.get<PeriodExportStatus>(`/exports/periods/${period}`, signal),
  });
}

export function useStartExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => api.post<ExportRun>("/exports", { period }),
    // Le nouveau run est ajouté en tête de liste tout de suite, ce qui déclenche aussi le suivi toutes les 5 s.
    onSuccess: (run) => queryClient.setQueryData<ExportRun[]>(exportKeys.runs, (runs = []) => [run, ...runs]),
  });
}
