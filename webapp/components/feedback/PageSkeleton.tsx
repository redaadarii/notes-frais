import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "./TableSkeleton";

/** Squelette d'une page complète (titre + tableau), le temps de connaître l'utilisateur. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement de la page">
      <Skeleton className="h-8 w-72" />
      <TableSkeleton />
    </div>
  );
}
