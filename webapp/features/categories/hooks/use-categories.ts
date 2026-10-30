"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CategoryCreate, CategoryUpdate } from "../schemas";
import type { Category } from "../types";

export const categoriesKey = ["categories"] as const;

/** Référentiel stable : 10 minutes avant de le considérer périmé. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: ({ signal }) => api.get<Category[]>("/categories", signal),
    staleTime: 10 * 60_000,
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload:
        { mode: "create"; input: CategoryCreate } | { mode: "update"; code: string; input: CategoryUpdate },
    ) =>
      payload.mode === "create"
        ? api.post<Category>("/categories", payload.input)
        : api.put<Category>(`/categories/${payload.code}`, payload.input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}
