import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id: string;
  label: string;
  errors?: string[];
  hint?: string;
  /** Reçoit les attributs d'accessibilité à poser sur le champ (aria-invalid, aria-describedby). */
  children: (aria: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Libellé + champ + message d'erreur, reliés entre eux pour les lecteurs d'écran. */
export function FormField({ id, label, errors, hint, children }: FormFieldProps) {
  const hasError = !!errors?.length;
  const describedBy = hasError ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": hasError, "aria-describedby": describedBy })}
      {hasError ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {errors![0]}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-muted-foreground text-sm">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
