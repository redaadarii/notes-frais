import { exportRequestSchema } from "@/features/exports/schemas";
import { listExportRuns, startExport } from "@/features/exports/server/service";
import { authenticated, json, readJson } from "@/server/http/route";

/** GET /api/v1/exports : derniers exports (runs du job). */
export const GET = authenticated(async (_request, user) => json(await listExportRuns(user)));

/** POST /api/v1/exports { period } : lance le job ; 202 car le traitement continue en arrière-plan. */
export const POST = authenticated(async (request, user) => {
  const { period } = await readJson(request, exportRequestSchema);
  return json(await startExport(user, period), 202);
});
