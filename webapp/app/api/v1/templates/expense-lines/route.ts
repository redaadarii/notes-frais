import { listCategories } from "@/features/categories/server/service";
import { buildLinesTemplate } from "@/features/reports/server/spreadsheet";
import { authenticated } from "@/server/http/route";

/** GET /api/v1/templates/expense-lines : modèle Excel d'import de dépenses, avec les catégories à jour. */
export const GET = authenticated(async () => {
  const content = await buildLinesTemplate(await listCategories());
  return new Response(content, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-depenses.xlsx"',
    },
  });
});
