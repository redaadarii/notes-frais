"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Dashboard } from "../types";

export const dashboardKey = ["dashboard"] as const;

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: ({ signal }) => api.get<Dashboard>("/dashboard", signal),
  });
}
