import { z } from "zod";
import { REPORT_SCOPES, REPORT_STATUSES, WORKFLOW_ACTIONS } from "./types";

/**
 * Schémas Zod partagés : le formulaire les applique pour un retour immédiat,
 * l'API les applique à nouveau car une requête peut toujours être forgée.
 */

export const MAX_AMOUNT = 100_000;
export const MAX_IMPORT_LINES = 200;
export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 Mo
export const RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export const periodSchema = z
  .string({ error: "La période est obligatoire" })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Période au format AAAA-MM attendue (ex. 2026-10)");

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Montant positif, au centime près. */
export const amountSchema = z.coerce
  .number({ error: "Le montant doit être un nombre" })
  .positive("Le montant doit être supérieur à 0")
  .max(MAX_AMOUNT, `Le montant ne peut pas dépasser ${MAX_AMOUNT.toLocaleString("fr-FR")} €`)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Deux décimales au maximum");

export const reportInputSchema = z.object({
  title: z
    .string({ error: "Le titre est obligatoire" })
    .trim()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(120, "120 caractères au maximum"),
  period: periodSchema,
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const lineInputSchema = z.object({
  expenseDate: z.iso
    .date({ error: "Date invalide" })
    .refine((d) => d <= todayIso(), "Une dépense ne peut pas être dans le futur"),
  categoryCode: z
    .string({ error: "La catégorie est obligatoire" })
    .trim()
    .min(1, "La catégorie est obligatoire")
    .max(20)
    .toUpperCase(),
  description: z
    .string({ error: "La description est obligatoire" })
    .trim()
    .min(3, "La description doit contenir au moins 3 caractères")
    .max(250, "250 caractères au maximum"),
  amount: amountSchema,
});
export type LineInput = z.infer<typeof lineInputSchema>;

export const transitionInputSchema = z
  .object({
    action: z.enum(WORKFLOW_ACTIONS, { error: "Action inconnue" }),
    comment: z.string().trim().max(500, "500 caractères au maximum").optional(),
  })
  .refine((input) => input.action !== "REJECT" || (input.comment?.length ?? 0) >= 5, {
    message: "Le motif du rejet est obligatoire (5 caractères au minimum)",
    path: ["comment"],
  });
export type TransitionInput = z.infer<typeof transitionInputSchema>;

export const reportListQuerySchema = z.object({
  scope: z.enum(REPORT_SCOPES).default("mine"),
  status: z.enum(REPORT_STATUSES).optional(),
  period: periodSchema.optional(),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const receiptFileSchema = z
  .instanceof(File, { error: "Le justificatif est obligatoire" })
  .refine((f) => f.size > 0, "Le fichier est vide")
  .refine((f) => f.size <= MAX_RECEIPT_SIZE, "Le justificatif dépasse 10 Mo")
  .refine(
    (f) => (RECEIPT_TYPES as readonly string[]).includes(f.type),
    "Formats acceptés : PDF, JPEG, PNG, WebP",
  );

export const spreadsheetFileSchema = z
  .instanceof(File, { error: "Le fichier Excel est obligatoire" })
  .refine((f) => f.size > 0, "Le fichier est vide")
  .refine((f) => f.size <= 5 * 1024 * 1024, "Le fichier dépasse 5 Mo")
  .refine((f) => f.name.toLowerCase().endsWith(".xlsx"), "Seuls les fichiers .xlsx sont acceptés");
