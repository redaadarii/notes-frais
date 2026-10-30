import { reportInputSchema } from "@/features/reports/schemas";
import { deleteReport, getReport, updateReport } from "@/features/reports/server/service";
import { authenticated, json, noContent, readJson } from "@/server/http/route";

type Context = RouteContext<"/api/v1/reports/[id]">;

/** GET /api/v1/reports/:id : détail complet (lignes, historique, anomalies, actions possibles). */
export const GET = authenticated<Context>(async (_request, user, { params }) => {
  const { id } = await params;
  return json(await getReport(user, id));
});

/** PATCH /api/v1/reports/:id : titre et période d'un brouillon ou d'une note rejetée. */
export const PATCH = authenticated<Context>(async (request, user, { params }) => {
  const { id } = await params;
  await updateReport(user, id, await readJson(request, reportInputSchema));
  return json(await getReport(user, id));
});

/** DELETE /api/v1/reports/:id : suppression d'un brouillon. */
export const DELETE = authenticated<Context>(async (_request, user, { params }) => {
  const { id } = await params;
  await deleteReport(user, id);
  return noContent();
});
