import { z } from "zod";
import { periodSchema } from "@/features/reports/schemas";

export const exportRequestSchema = z.object({ period: periodSchema });
export type ExportRequest = z.infer<typeof exportRequestSchema>;

/** Nom d'un fichier produit par le job : « EXP-2026-09-20261001-060000.xlsx ». Bloque toute traversée de chemin. */
export const exportFileNameSchema = z
  .string()
  .regex(/^EXP-\d{4}-\d{2}-\d{8}-\d{6}\.xlsx$/, "Nom de fichier invalide");
