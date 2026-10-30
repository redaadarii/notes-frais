import "server-only";
import type { CurrentUser } from "@/features/auth/types";
import { requirePermission } from "@/server/auth/authorization";
import { BusinessRuleError, NotFoundError } from "@/server/errors";
import type { CategoryCreate, CategoryUpdate } from "../schemas";
import type { Category } from "../types";
import * as repository from "./repository";

/** Toute personne connectée lit les catégories (formulaire de saisie). */
export const listCategories = (): Promise<Category[]> => repository.listCategories();

export async function createCategory(user: CurrentUser, input: CategoryCreate): Promise<Category> {
  requirePermission(user, "category:manage");
  if (await repository.findCategory(input.code)) {
    throw new BusinessRuleError(`La catégorie ${input.code} existe déjà`, {
      code: ["Ce code est déjà utilisé"],
    });
  }
  await repository.insertCategory(input);
  console.info(JSON.stringify({ event: "category_created", by: user.email, code: input.code }));
  return { ...input };
}

export async function updateCategory(
  user: CurrentUser,
  code: string,
  input: CategoryUpdate,
): Promise<Category> {
  requirePermission(user, "category:manage");
  if ((await repository.updateCategory(code, input)) === 0) {
    throw new NotFoundError(`Catégorie ${code} introuvable`);
  }
  console.info(JSON.stringify({ event: "category_updated", by: user.email, code }));
  return { code, ...input };
}
