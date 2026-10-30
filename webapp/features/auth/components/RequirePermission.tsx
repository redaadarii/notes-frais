"use client";

import type { ReactNode } from "react";
import { Forbidden } from "@/components/feedback/Forbidden";
import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { useCurrentUser } from "../hooks/use-current-user";
import type { Permission } from "../roles";

/**
 * Masque une page à qui n'a pas la permission. Confort d'affichage uniquement :
 * l'API refuse de toute façon (403) ; ceci évite juste d'afficher un écran vide d'erreurs.
 */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { data: user } = useCurrentUser();
  if (!user) return <PageSkeleton />; // l'erreur d'identification est affichée par AppShell
  return user.permissions.includes(permission) ? children : <Forbidden />;
}
