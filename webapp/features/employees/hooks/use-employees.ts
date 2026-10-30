"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Employee } from "../types";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: ({ signal }) => api.get<Employee[]>("/employees", signal),
    staleTime: 10 * 60_000,
  });
}
