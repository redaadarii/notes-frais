import { categoryUpdateSchema } from "@/features/categories/schemas";
import { updateCategory } from "@/features/categories/server/service";
import { authenticated, json, readJson } from "@/server/http/route";

/** PUT /api/v1/categories/:code : modification (administrateur). Le code est l'identifiant, il ne change pas. */
export const PUT = authenticated<RouteContext<"/api/v1/categories/[code]">>(
  async (request, user, { params }) => {
    const { code } = await params;
    return json(
      await updateCategory(user, code.toUpperCase(), await readJson(request, categoryUpdateSchema)),
    );
  },
);
