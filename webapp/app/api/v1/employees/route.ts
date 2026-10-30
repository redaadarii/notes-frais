import { listEmployees } from "@/features/employees/server/service";
import { authenticated, json } from "@/server/http/route";

/** GET /api/v1/employees : référentiel des collaborateurs (finance, administrateur). */
export const GET = authenticated(async (_request, user) => json(await listEmployees(user)));
