"use client";

import { useState } from "react";
import type { z } from "zod";
import { ApiError } from "@/lib/api-client";
import { fieldErrorsOf } from "@/lib/validation";

/**
 * État d'un formulaire contrôlé validé par un schéma Zod :
 * - `validate()` applique le MÊME schéma que l'API, pour un retour immédiat ;
 * - `setServerErrors()` affiche sous les champs les erreurs renvoyées par l'API.
 */
export function useZodForm<S extends z.ZodType<unknown, Record<string, unknown>>>(
  schema: S,
  initialValues: z.input<S>,
) {
  const [values, setValues] = useState<z.input<S>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const setField = <K extends keyof z.input<S>>(field: K, value: z.input<S>[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    // L'erreur du champ disparaît dès qu'on le corrige
    setErrors((current) => {
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const validate = (): z.output<S> | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    setErrors(fieldErrorsOf(result.error));
    return null;
  };

  const setServerErrors = (error: unknown) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
  };

  const reset = (next: z.input<S> = initialValues) => {
    setValues(next);
    setErrors({});
  };

  return { values, errors, setField, validate, setServerErrors, reset };
}
