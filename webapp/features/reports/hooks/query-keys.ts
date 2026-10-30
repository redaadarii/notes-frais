import type { ReportListQuery } from "../schemas";

/**
 * Clés React Query de la fonctionnalité, construites du général au particulier :
 * invalider `reportKeys.all` rafraîchit toutes les listes ET tous les détails.
 */
export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (query: ReportListQuery) => [...reportKeys.lists(), query] as const,
  detail: (id: string) => [...reportKeys.all, "detail", id] as const,
};
