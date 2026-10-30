import { authenticated, json } from "@/server/http/route";

/** GET /api/v1/me : identité, rôles et permissions de la personne connectée. */
export const GET = authenticated(async (_request, user) => json(user));
