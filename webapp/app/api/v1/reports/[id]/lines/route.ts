import { lineInputSchema } from "@/features/reports/schemas";
import { addLine } from "@/features/reports/server/service";
import { authenticated, json, readJson } from "@/server/http/route";

/** POST /api/v1/reports/:id/lines : ajoute une dépense. */
export const POST = authenticated<RouteContext<"/api/v1/reports/[id]/lines">>(
  async (request, user, { params }) => {
    const { id } = await params;
    return json(await addLine(user, id, await readJson(request, lineInputSchema)), 201);
  },
);
