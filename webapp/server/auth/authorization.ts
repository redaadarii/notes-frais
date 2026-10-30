import "server-only";
import { hasPermission, type Permission } from "@/features/auth/roles";
import type { CurrentUser } from "@/features/auth/types";
import { ForbiddenError } from "@/server/errors";

/** Garde à appeler en tête de chaque service. Masquer un bouton à l'écran ne protège rien : ceci, si. */
export function requirePermission(user: CurrentUser, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    console.warn(
      `[securite] ${user.email} (rôles : ${user.roles.join(", ") || "aucun"}) → ${permission} refusé`,
    );
    throw new ForbiddenError();
  }
}
