import { spreadsheetFileSchema } from "@/features/reports/schemas";
import { importLines } from "@/features/reports/server/service";
import { authenticated, json, problem, readFormData, validate } from "@/server/http/route";

/**
 * POST /api/v1/reports/:id/lines/import (multipart, champ « file »)
 * 201 si tout est importé ; 422 avec la liste des erreurs par ligne Excel sinon (rien n'est importé).
 */
export const POST = authenticated<RouteContext<"/api/v1/reports/[id]/lines/import">>(
  async (request, user, { params }) => {
    const { id } = await params;
    const file = validate(spreadsheetFileSchema, (await readFormData(request)).get("file"));
    const result = await importLines(user, id, file);
    if (result.ok) return json({ imported: result.imported }, 201);

    return problem(
      422,
      "Fichier refusé",
      `${result.errors.length} erreur(s) : corrigez le fichier puis réimportez-le`,
      {
        rows: result.errors,
      },
    );
  },
);
