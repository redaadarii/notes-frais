import { receiptFileSchema } from "@/features/reports/schemas";
import { attachReceipt, openReceipt } from "@/features/reports/server/service";
import { authenticated, noContent, readFormData, validate } from "@/server/http/route";

type Context = RouteContext<"/api/v1/reports/[id]/lines/[lineId]/receipt">;

/** PUT /api/v1/reports/:id/lines/:lineId/receipt (multipart, champ « file ») : dépose ou remplace le justificatif. */
export const PUT = authenticated<Context>(async (request, user, { params }) => {
  const { id, lineId } = await params;
  const file = validate(receiptFileSchema, (await readFormData(request)).get("file"));
  await attachReceipt(user, id, lineId, file);
  return noContent();
});

/** GET /api/v1/reports/:id/lines/:lineId/receipt : le fichier est relayé en flux depuis le volume. */
export const GET = authenticated<Context>(async (_request, user, { params }) => {
  const { id, lineId } = await params;
  const { name, response } = await openReceipt(user, id, lineId);
  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
