import { lineInputSchema } from "@/features/reports/schemas";
import { deleteLine, updateLine } from "@/features/reports/server/service";
import { authenticated, noContent, readJson } from "@/server/http/route";

type Context = RouteContext<"/api/v1/reports/[id]/lines/[lineId]">;

/** PUT /api/v1/reports/:id/lines/:lineId : remplace une dépense. */
export const PUT = authenticated<Context>(async (request, user, { params }) => {
  const { id, lineId } = await params;
  await updateLine(user, id, lineId, await readJson(request, lineInputSchema));
  return noContent();
});

/** DELETE /api/v1/reports/:id/lines/:lineId */
export const DELETE = authenticated<Context>(async (_request, user, { params }) => {
  const { id, lineId } = await params;
  await deleteLine(user, id, lineId);
  return noContent();
});
