import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api-client";

function mockFetch(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status });
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

afterEach(() => vi.restoreAllMocks());

describe("api", () => {
  it("préfixe les chemins par /api/v1 et envoie le JSON", async () => {
    const fetchMock = mockFetch(201, { id: "42" });
    await expect(api.post("/reports", { title: "x" })).resolves.toEqual({ id: "42" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reports",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "x" }) }),
    );
  });

  it("transforme une réponse problem+json en ApiError avec les erreurs par champ", async () => {
    mockFetch(400, {
      status: 400,
      title: "Requête invalide",
      detail: "Valeurs invalides",
      errors: { title: ["Trop court"] },
    });
    const error = await api.post("/reports", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Valeurs invalides",
      fieldErrors: { title: ["Trop court"] },
    });
    expect((error as ApiError).isClientError).toBe(true);
  });

  it("gère une réponse 204 sans corps", async () => {
    mockFetch(204);
    await expect(api.delete("/reports/1")).resolves.toBeUndefined();
  });
});
