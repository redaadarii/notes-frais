import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { ReportForm } from "./ReportForm";

const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <ReportForm
      initialValues={{ title: "", period: "2026-10" }}
      submitLabel="Créer"
      pending={false}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
};

describe("ReportForm", () => {
  it("affiche l'erreur de validation sous le champ et n'appelle pas l'API", async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("au moins 3 caractères");
    expect(screen.getByLabelText("Titre")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("transmet la saisie nettoyée", async () => {
    const onSubmit = renderForm();
    await userEvent.type(screen.getByLabelText("Titre"), "  Salon Lyon  ");
    await userEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "Salon Lyon", period: "2026-10" });
  });

  it("affiche sous le champ l'erreur renvoyée par l'API", async () => {
    renderForm(
      vi.fn().mockRejectedValue(new ApiError(422, "Règle", "Refus", { title: ["Titre déjà utilisé"] })),
    );
    await userEvent.type(screen.getByLabelText("Titre"), "Salon Lyon");
    await userEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Titre déjà utilisé");
  });
});
