import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de tableau : la page garde sa forme pendant le chargement. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
