import { reportInputSchema, reportListQuerySchema } from "@/features/reports/schemas";
import { createReport, listReports } from "@/features/reports/server/service";
import { authenticated, json, readJson, validate } from "@/server/http/route";

/** GET /api/v1/reports?scope=mine|team|finance|all&status=…&period=AAAA-MM */
export const GET = authenticated(async (request, user) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return json(await listReports(user, validate(reportListQuerySchema, params)));
});

/** POST /api/v1/reports : crée un brouillon ; renvoie 201 et son identifiant. */
export const POST = authenticated(async (request, user) =>
  json(await createReport(user, await readJson(request, reportInputSchema)), 201),
);
