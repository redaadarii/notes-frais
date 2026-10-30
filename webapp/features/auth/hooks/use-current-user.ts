"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CurrentUser } from "../types";

export const currentUserKey = ["me"] as const;

/** Identité et permissions : changent rarement, on les garde 5 minutes. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => api.get<CurrentUser>("/me", signal),
    staleTime: 5 * 60_000,
  });
}
