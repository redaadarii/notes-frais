import { getDashboard } from "@/features/dashboard/server/service";
import { authenticated, json } from "@/server/http/route";

/** GET /api/v1/dashboard : indicateurs adaptés aux rôles de l'utilisateur. */
export const GET = authenticated(async (_request, user) => json(await getDashboard(user)));
