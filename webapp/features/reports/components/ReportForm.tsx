"use client";

import type { FormEvent } from "react";
import { FormField } from "@/components/forms/FormField";
import { PeriodSelect } from "@/components/forms/PeriodSelect";
import { useZodForm } from "@/components/forms/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportInputSchema, type ReportInput } from "../schemas";

interface ReportFormProps {
  initialValues: ReportInput;
  submitLabel: string;
  pending: boolean;
  /** Renvoie l'erreur éventuelle de l'API, pour l'afficher sous les champs concernés. */
  onSubmit: (input: ReportInput) => Promise<unknown>;
  onCancel?: () => void;
}

/** En-tête d'une note (titre, période) : sert à la création comme à la modification. */
export function ReportForm({ initialValues, submitLabel, pending, onSubmit, onCancel }: ReportFormProps) {
  const form = useZodForm(reportInputSchema, initialValues);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = form.validate();
    if (input) await onSubmit(input).catch(form.setServerErrors);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField id="title" label="Titre" errors={form.errors.title} hint="Ex. « Salon VivaTech — Paris »">
        {(aria) => (
          <Input
            {...aria}
            value={form.values.title}
            onChange={(e) => form.setField("title", e.target.value)}
            autoFocus
          />
        )}
      </FormField>
      <FormField id="period" label="Mois des dépenses" errors={form.errors.period}>
        {(aria) => (
          <PeriodSelect {...aria} value={form.values.period} onChange={(v) => form.setField("period", v)} />
        )}
      </FormField>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
