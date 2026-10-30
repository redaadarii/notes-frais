"use client";

import type { FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { useZodForm } from "@/components/forms/use-zod-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveCategory } from "../hooks/use-categories";
import { categoryCreateSchema } from "../schemas";
import type { Category } from "../types";

interface CategoryFormDialogProps {
  /** Catégorie à modifier ; absente = création. */
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const form = useZodForm(categoryCreateSchema, {
    code: category?.code ?? "",
    label: category?.label ?? "",
    unitLimit: category?.unitLimit == null ? "" : String(category.unitLimit),
    receiptRequired: category?.receiptRequired ?? true,
    glAccount: category?.glAccount ?? "",
  });
  const saveCategory = useSaveCategory();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = form.validate();
    if (!input) return;
    const { code, ...update } = input;
    try {
      await saveCategory.mutateAsync(
        category ? { mode: "update", code, input: update } : { mode: "create", input },
      );
      toast.success(category ? "Catégorie modifiée" : "Catégorie créée");
      onDone();
    } catch (error) {
      form.setServerErrors(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="code"
          label="Code"
          errors={form.errors.code}
          hint={category ? "Non modifiable" : "Ex. PARKING"}
        >
          {(aria) => (
            <Input
              {...aria}
              value={form.values.code}
              disabled={!!category}
              onChange={(e) => form.setField("code", e.target.value.toUpperCase())}
            />
          )}
        </FormField>
        <FormField id="glAccount" label="Compte comptable" errors={form.errors.glAccount}>
          {(aria) => (
            <Input
              {...aria}
              inputMode="numeric"
              maxLength={4}
              value={form.values.glAccount}
              onChange={(e) => form.setField("glAccount", e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField id="label" label="Libellé" errors={form.errors.label}>
        {(aria) => (
          <Input
            {...aria}
            value={form.values.label}
            onChange={(e) => form.setField("label", e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="unitLimit"
        label="Plafond par dépense (€)"
        errors={form.errors.unitLimit}
        hint="Vide = sans plafond"
      >
        {(aria) => (
          <Input
            {...aria}
            inputMode="decimal"
            value={String(form.values.unitLimit ?? "")}
            onChange={(e) => form.setField("unitLimit", e.target.value.replace(",", "."))}
          />
        )}
      </FormField>
      <div className="flex items-center gap-2">
        <input
          id="receiptRequired"
          type="checkbox"
          className="accent-primary size-4"
          checked={form.values.receiptRequired}
          onChange={(e) => form.setField("receiptRequired", e.target.checked)}
        />
        <Label htmlFor="receiptRequired">Justificatif obligatoire</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={saveCategory.isPending}>
          {saveCategory.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export function CategoryFormDialog({ category, open, onOpenChange }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? `Modifier « ${category.label} »` : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>
            Les plafonds servent aux contrôles automatiques ; le compte, à l&apos;export.
          </DialogDescription>
        </DialogHeader>
        {open && <CategoryForm category={category} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
