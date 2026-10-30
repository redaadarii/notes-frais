"use client";

import type { FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { useZodForm } from "@/components/forms/use-zod-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { formatMoney } from "@/lib/format";
import { useSaveLine, useUploadReceipt } from "../hooks/use-report-mutations";
import { lineInputSchema, receiptFileSchema, RECEIPT_TYPES } from "../schemas";
import type { ExpenseLine } from "../types";

interface LineFormDialogProps {
  reportId: string;
  /** Ligne à modifier ; absente = création. */
  line?: ExpenseLine;
  defaultDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toFormValues = (line: ExpenseLine | undefined, defaultDate: string) => ({
  expenseDate: line?.expenseDate ?? defaultDate,
  categoryCode: line?.categoryCode ?? "",
  description: line?.description ?? "",
  amount: line ? String(line.amount) : "",
});

function LineForm({
  reportId,
  line,
  defaultDate,
  onDone,
}: Omit<LineFormDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const { data: categories = [] } = useCategories();
  const form = useZodForm(lineInputSchema, toFormValues(line, defaultDate));
  const saveLine = useSaveLine(reportId);
  const uploadReceipt = useUploadReceipt(reportId);
  const pending = saveLine.isPending || uploadReceipt.isPending;

  const category = categories.find((c) => c.code === form.values.categoryCode);
  const amount = Number(String(form.values.amount).replace(",", "."));
  const overLimit = category?.unitLimit != null && amount > category.unitLimit;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("receipt");
    const receipt = file instanceof File && file.size > 0 ? receiptFileSchema.safeParse(file) : null;
    const input = form.validate();
    if (receipt && !receipt.success) {
      toast.error(receipt.error.issues[0]!.message);
      return;
    }
    if (!input) return;

    try {
      const { id } = await saveLine.mutateAsync({ lineId: line?.id, input });
      if (receipt?.success) await uploadReceipt.mutateAsync({ lineId: id, file: receipt.data });
      toast.success(line ? "Dépense modifiée" : "Dépense ajoutée");
      onDone();
    } catch (error) {
      form.setServerErrors(error); // le toast d'erreur est déjà affiché par le client React Query
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="expenseDate" label="Date" errors={form.errors.expenseDate}>
          {(aria) => (
            <Input
              {...aria}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.values.expenseDate}
              onChange={(e) => form.setField("expenseDate", e.target.value)}
            />
          )}
        </FormField>
        <FormField
          id="amount"
          label="Montant (€)"
          errors={form.errors.amount}
          hint={category?.unitLimit != null ? `Plafond : ${formatMoney(category.unitLimit)}` : undefined}
        >
          {(aria) => (
            <Input
              {...aria}
              inputMode="decimal"
              placeholder="0,00"
              value={String(form.values.amount ?? "")}
              onChange={(e) => form.setField("amount", e.target.value.replace(",", "."))}
            />
          )}
        </FormField>
      </div>
      <FormField id="categoryCode" label="Catégorie" errors={form.errors.categoryCode}>
        {(aria) => (
          <Select value={form.values.categoryCode} onValueChange={(v) => form.setField("categoryCode", v)}>
            <SelectTrigger className="w-full" {...aria}>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField id="description" label="Description" errors={form.errors.description}>
        {(aria) => (
          <Input
            {...aria}
            placeholder="Ex. Déjeuner client — société Atlas"
            value={form.values.description}
            onChange={(e) => form.setField("description", e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="receipt"
        label={
          category?.receiptRequired
            ? "Justificatif (obligatoire pour soumettre)"
            : "Justificatif (facultatif)"
        }
        hint={
          line?.receiptName
            ? `Actuel : ${line.receiptName} — choisir un fichier le remplace`
            : "PDF ou image, 10 Mo maximum"
        }
      >
        {(aria) => <Input {...aria} name="receipt" type="file" accept={RECEIPT_TYPES.join(",")} />}
      </FormField>

      {overLimit && (
        <Alert>
          <AlertDescription>
            Ce montant dépasse le plafond de la catégorie : la dépense sera signalée aux valideurs.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : line ? "Enregistrer" : "Ajouter la dépense"}
        </Button>
      </div>
    </form>
  );
}

export function LineFormDialog({ open, onOpenChange, ...props }: LineFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.line ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          <DialogDescription>Les montants sont en euros, TTC.</DialogDescription>
        </DialogHeader>
        {/* Monté à l'ouverture seulement : le formulaire repart toujours des bonnes valeurs. */}
        {open && <LineForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
