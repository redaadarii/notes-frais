"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { dashboardKey } from "@/features/dashboard/hooks/use-dashboard";
import { api } from "@/lib/api-client";
import type { LineInput, ReportInput, TransitionInput } from "../schemas";
import type { ReportDetail } from "../types";
import { reportKeys } from "./query-keys";

/**
 * Toutes les écritures sur les notes. Après chaque succès, on invalide ce qui a pu changer :
 * le détail de la note, les listes (total, statut) et le tableau de bord (compteurs).
 */

function invalidateReport(queryClient: QueryClient, id: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: reportKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: reportKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: dashboardKey }),
  ]);
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportInput) => api.post<{ id: string }>("/reports", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useUpdateReport(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportInput) => api.patch<ReportDetail>(`/reports/${id}`, input),
    // La réponse EST le nouveau détail : on l'installe directement dans le cache, sans refaire de GET.
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(id), report);
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: reportKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useTransition(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransitionInput) => api.post<ReportDetail>(`/reports/${id}/transitions`, input),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(id), report);
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useSaveLine(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, input }: { lineId?: string; input: LineInput }) =>
      lineId
        ? api.put<void>(`/reports/${reportId}/lines/${lineId}`, input).then(() => ({ id: lineId }))
        : api.post<{ id: string }>(`/reports/${reportId}/lines`, input),
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}

export function useDeleteLine(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => api.delete(`/reports/${reportId}/lines/${lineId}`),
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}

export function useUploadReceipt(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, file }: { lineId: string; file: File }) => {
      const form = new FormData();
      form.set("file", file);
      return api.upload<void>(`/reports/${reportId}/lines/${lineId}/receipt`, form, "PUT");
    },
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}

export function useImportLines(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("file", file);
      return api.upload<{ imported: number }>(`/reports/${reportId}/lines/import`, form);
    },
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}
