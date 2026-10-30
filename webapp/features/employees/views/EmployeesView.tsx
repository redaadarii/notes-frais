"use client";

import { UsersIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { useEmployees } from "../hooks/use-employees";

function Employees() {
  const { data: employees, isPending, error, refetch } = useEmployees();
  const [search, setSearch] = useState("");
  // La saisie reste fluide : le filtrage suit avec un léger différé si la liste est longue.
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const visible = (employees ?? []).filter(
    (e) => e.fullName.toLowerCase().includes(deferredSearch) || e.email.includes(deferredSearch),
  );

  return (
    <>
      <PageHeader
        title="Collaborateurs"
        description="Référentiel synchronisé depuis Entra ID / le SIRH par le job de setup (lecture seule)."
      />
      <Input
        type="search"
        aria-label="Rechercher un collaborateur"
        placeholder="Rechercher par nom ou e-mail…"
        className="mb-4 max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Aucun collaborateur trouvé" />
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Centre de coût</TableHead>
                <TableHead className="text-right">Équipe</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((employee) => (
                <TableRow key={employee.email}>
                  <TableCell>
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-muted-foreground text-xs">{employee.email}</p>
                  </TableCell>
                  <TableCell>{employee.managerName ?? "—"}</TableCell>
                  <TableCell>{employee.costCenter}</TableCell>
                  <TableCell className="text-right tabular-nums">{employee.directReports || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={employee.active ? "secondary" : "outline"}>
                      {employee.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

export function EmployeesView() {
  return (
    <RequirePermission permission="employee:read">
      <Employees />
    </RequirePermission>
  );
}
