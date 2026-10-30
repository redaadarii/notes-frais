"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { currentPeriod } from "@/lib/format";
import { ReportForm } from "../components/ReportForm";
import { useCreateReport } from "../hooks/use-report-mutations";

function NewReport() {
  const router = useRouter();
  const createReport = useCreateReport();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Nouvelle note de frais"
        description="Vous ajouterez les dépenses à l'étape suivante."
      />
      <Card>
        <CardContent>
          <ReportForm
            initialValues={{ title: "", period: currentPeriod() }}
            submitLabel="Créer la note"
            pending={createReport.isPending}
            onCancel={() => router.back()}
            onSubmit={(input) =>
              createReport.mutateAsync(input).then(({ id }) => {
                toast.success("Note créée : ajoutez vos dépenses");
                router.push(`/reports/${id}`);
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function NewReportView() {
  return (
    <RequirePermission permission="report:create">
      <NewReport />
    </RequirePermission>
  );
}
