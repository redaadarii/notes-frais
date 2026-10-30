"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ReportListQuery } from "../schemas";
import type { ReportDetail, ReportSummary } from "../types";
import { reportKeys } from "./query-keys";

function toSearchParams(query: ReportListQuery): string {
  const params = new URLSearchParams({ scope: query.scope });
  if (query.status) params.set("status", query.status);
  if (query.period) params.set("period", query.period);
  return params.toString();
}

export function useReports(query: ReportListQuery) {
  return useQuery({
    queryKey: reportKeys.list(query),
    queryFn: ({ signal }) => api.get<ReportSummary[]>(`/reports?${toSearchParams(query)}`, signal),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: ({ signal }) => api.get<ReportDetail>(`/reports/${id}`, signal),
  });
}
