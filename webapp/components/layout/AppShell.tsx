"use client";

import { MenuIcon, ReceiptIcon, ShieldXIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { CurrentUser } from "@/features/auth/types";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3 font-semibold">
      <ReceiptIcon className="text-primary size-5" aria-hidden />
      Notes de frais
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Chargement du menu">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** `user` absent tant que l'identité n'est pas chargée : le menu affiche un squelette, la page s'affiche déjà. */
function SidebarContent({ user, onNavigate }: { user?: CurrentUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Brand />
      <Separator />
      {user ? <NavLinks user={user} onNavigate={onNavigate} /> : <NavSkeleton />}
      <div className="mt-auto">
        <Separator className="mb-4" />
        {user ? <UserMenu user={user} /> : <Skeleton className="h-10 w-full" />}
      </div>
    </div>
  );
}

/**
 * Structure de toutes les pages : menu latéral (tiroir sur mobile) et zone de contenu.
 *
 * La page ({children}) est TOUJOURS rendue, y compris côté serveur où l'identité n'est pas
 * encore connue : chaque page gère son propre chargement. Seul un problème d'identification
 * avéré (erreur, ou personne sans aucun rôle) remplace le contenu par une explication.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, error, refetch } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const identityProblem = error ? (
    <ErrorState error={error} title="Identification impossible" onRetry={() => refetch()} />
  ) : user && user.roles.length === 0 ? (
    <EmptyState
      icon={ShieldXIcon}
      title="Aucun accès à l'application"
      description={`Le compte ${user.email} n'appartient à aucun groupe « notes-frais-* ». Demandez votre ajout au groupe adapté dans Entra ID.`}
    />
  ) : null;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <aside className="bg-card sticky top-0 hidden h-screen border-r md:block">
        <SidebarContent user={user} />
      </aside>

      <header className="bg-card flex items-center gap-2 border-b p-3 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <Brand />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {identityProblem ?? children}
      </main>
    </div>
  );
}
