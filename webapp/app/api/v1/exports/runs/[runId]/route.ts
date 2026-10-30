import { z } from "zod";
import { getExportRun } from "@/features/exports/server/service";
import { authenticated, json, validate } from "@/server/http/route";

/** GET /api/v1/exports/runs/:runId : état d'un export, interrogé régulièrement par l'écran. */
export const GET = authenticated<RouteContext<"/api/v1/exports/runs/[runId]">>(
  async (_request, user, { params }) => {
    const runId = validate(z.coerce.number().int().positive(), (await params).runId);
    return json(await getExportRun(user, runId));
  },
);
