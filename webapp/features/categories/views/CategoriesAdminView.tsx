"use client";

import { PencilIcon, PlusIcon, TagsIcon } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequirePermission } from "@/features/auth/components/RequirePermission";
import { formatMoney } from "@/lib/format";
import { CategoryFormDialog } from "../components/CategoryFormDialog";
import { useCategories } from "../hooks/use-categories";
import type { Category } from "../types";

function CategoriesAdmin() {
  const { data: categories, isPending, error, refetch } = useCategories();
  // undefined : fermé ; null : création ; sinon la catégorie modifiée
  const [edited, setEdited] = useState<Category | null>();

  return (
    <>
      <PageHeader
        title="Catégories de dépense"
        description="Plafonds, justificatifs obligatoires et comptes comptables."
        actions={
          <Button onClick={() => setEdited(null)}>
            <PlusIcon /> Nouvelle catégorie
          </Button>
        }
      />
      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState icon={TagsIcon} title="Aucune catégorie" />
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Plafond</TableHead>
                <TableHead>Justificatif</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.code}>
                  <TableCell className="font-mono text-sm">{category.code}</TableCell>
                  <TableCell>{category.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {category.unitLimit === null ? "—" : formatMoney(category.unitLimit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.receiptRequired ? "default" : "outline"}>
                      {category.receiptRequired ? "Obligatoire" : "Facultatif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{category.glAccount}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier ${category.label}`}
                      onClick={() => setEdited(category)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CategoryFormDialog
        category={edited ?? undefined}
        open={edited !== undefined}
        onOpenChange={(open) => !open && setEdited(undefined)}
      />
    </>
  );
}

export function CategoriesAdminView() {
  return (
    <RequirePermission permission="category:manage">
      <CategoriesAdmin />
    </RequirePermission>
  );
}
