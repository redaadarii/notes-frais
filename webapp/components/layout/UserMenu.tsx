"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/features/auth/roles";
import type { CurrentUser } from "@/features/auth/types";

const initials = (name: string) =>
  name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

/** Pas de bouton « Déconnexion » : la session est celle de Databricks (SSO Entra ID). */
export function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
