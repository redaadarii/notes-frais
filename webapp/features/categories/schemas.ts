import { z } from "zod";

const label = z
  .string({ error: "Le libellé est obligatoire" })
  .trim()
  .min(2, "Le libellé doit contenir au moins 2 caractères")
  .max(60, "60 caractères au maximum");

const unitLimit = z
  .union([z.literal("").transform(() => null), z.null(), z.coerce.number()])
  .refine((v) => v === null || v > 0, "Le plafond doit être positif, ou vide pour « sans plafond »")
  .refine((v) => v === null || v <= 100_000, "Plafond trop élevé");

/** Même règle que le contrôle de qualité du job de setup : 4 chiffres. */
const glAccount = z
  .string({ error: "Le compte est obligatoire" })
  .regex(/^\d{4}$/, "Compte comptable à 4 chiffres");

export const categoryUpdateSchema = z.object({
  label,
  unitLimit,
  receiptRequired: z.boolean(),
  glAccount,
});
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export const categoryCreateSchema = categoryUpdateSchema.extend({
  code: z
    .string({ error: "Le code est obligatoire" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z_]{1,19}$/, "Code en majuscules, 2 à 20 lettres ou « _ » (ex. PARKING)"),
});
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
