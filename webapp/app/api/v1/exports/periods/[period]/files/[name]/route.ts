import { exportFileNameSchema } from "@/features/exports/schemas";
import { openExportFile } from "@/features/exports/server/service";
import { periodSchema } from "@/features/reports/schemas";
import { authenticated, validate } from "@/server/http/route";

/** GET /api/v1/exports/periods/:period/files/:name : téléchargement d'un classeur d'export. */
export const GET = authenticated<RouteContext<"/api/v1/exports/periods/[period]/files/[name]">>(
  async (_request, user, { params }) => {
    const raw = await params;
    const period = validate(periodSchema, raw.period);
    const name = validate(exportFileNameSchema, raw.name);
    const file = await openExportFile(user, period, name);
    return new Response(file.body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
