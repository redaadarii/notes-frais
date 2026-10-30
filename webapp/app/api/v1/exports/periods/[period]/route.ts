import { getPeriodStatus } from "@/features/exports/server/service";
import { periodSchema } from "@/features/reports/schemas";
import { authenticated, json, validate } from "@/server/http/route";

/** GET /api/v1/exports/periods/:period : notes en attente d'export et fichiers déjà produits. */
export const GET = authenticated<RouteContext<"/api/v1/exports/periods/[period]">>(
  async (_request, user, { params }) => {
    const period = validate(periodSchema, (await params).period);
    return json(await getPeriodStatus(user, period));
  },
);
