import { categoryCreateSchema } from "@/features/categories/schemas";
import { createCategory, listCategories } from "@/features/categories/server/service";
import { authenticated, json, readJson } from "@/server/http/route";

/** GET /api/v1/categories : catégories de dépense (toute personne connectée). */
export const GET = authenticated(async () => json(await listCategories()));

/** POST /api/v1/categories : création (administrateur). */
export const POST = authenticated(async (request, user) =>
  json(await createCategory(user, await readJson(request, categoryCreateSchema)), 201),
);
