import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { ReportDetailView } from "@/features/reports/views/ReportDetailView";

export const metadata: Metadata = { title: "Note de frais" };

/**
 * L'identifiant n'est connu qu'à la requête : il est lu SOUS une frontière Suspense,
 * pour que le cadre de la page s'affiche immédiatement. Les données arrivent ensuite
 * par GET /api/v1/reports/:id (React Query).
 */
export default function ReportPage({ params }: PageProps<"/reports/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportDetail params={params} />
    </Suspense>
  );
}

async function ReportDetail({ params }: Pick<PageProps<"/reports/[id]">, "params">) {
  const { id } = await params;
  return <ReportDetailView id={id} />;
}
