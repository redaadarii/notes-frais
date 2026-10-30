import { transitionInputSchema } from "@/features/reports/schemas";
import { transition } from "@/features/reports/server/service";
import { authenticated, json, readJson } from "@/server/http/route";

/**
 * POST /api/v1/reports/:id/transitions  { action: "SUBMIT" | "APPROVE" | "REJECT", comment? }
 * Une transition est une ressource à part entière : l'historique garde la trace de chacune.
 */
export const POST = authenticated<RouteContext<"/api/v1/reports/[id]/transitions">>(
  async (request, user, { params }) => {
    const { id } = await params;
    return json(await transition(user, id, await readJson(request, transitionInputSchema)));
  },
);
