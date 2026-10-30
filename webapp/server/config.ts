import "server-only";
import { z } from "zod";

/**
 * Configuration de l'application, validée UNE fois au premier accès.
 * Une variable manquante fait échouer la requête avec un message explicite,
 * au lieu d'une erreur obscure au fond d'un appel Databricks.
 *
 * Sur Databricks Apps, ces valeurs sont injectées par resources/app.yml (section config.env).
 */
const configSchema = z.object({
  DATABRICKS_HOST: z
    .string({ error: "DATABRICKS_HOST manquant" })
    .min(1)
    // Databricks Apps fournit l'hôte sans « https:// »
    .transform((raw) => (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/+$/, "")),
  DATABRICKS_WAREHOUSE_ID: z.string({ error: "DATABRICKS_WAREHOUSE_ID manquant" }).min(1),
  APP_CATALOG: z.string().min(1).default("workspace"),
  APP_SCHEMA: z.string({ error: "APP_SCHEMA manquant" }).min(1),
  RECEIPTS_VOLUME_PATH: z
    .string()
    .startsWith("/Volumes/", "RECEIPTS_VOLUME_PATH doit commencer par /Volumes/"),
  EXPORTS_VOLUME_PATH: z.string().startsWith("/Volumes/", "EXPORTS_VOLUME_PATH doit commencer par /Volumes/"),
  CONTROLS_JOB_ID: z.coerce.number().int().positive(),
  EXPORT_JOB_ID: z.coerce.number().int().positive(),
  GROUP_EMPLOYEES: z.string().default("notes-frais-employes"),
  GROUP_MANAGERS: z.string().default("notes-frais-managers"),
  GROUP_FINANCE: z.string().default("notes-frais-finance"),
  GROUP_ADMINS: z.string().default("notes-frais-admins"),
});

export type AppConfig = z.infer<typeof configSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ");
    throw new Error(`Configuration invalide — ${details}`);
  }
  cached = parsed.data;
  return cached;
}

export const isDevelopment = () => process.env.NODE_ENV === "development";
