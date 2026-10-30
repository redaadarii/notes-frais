"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError, errorMessage } from "@/lib/api-client";

/** Ne pas réessayer une erreur 4xx (droits, validation, introuvable) : le résultat serait le même. */
const shouldRetry = (failureCount: number, error: unknown) =>
  !(error instanceof ApiError && error.isClientError) && failureCount < 2;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
    // Règle unique : toute erreur d'écriture est annoncée par un toast. Les formulaires,
    // en plus, affichent sous chaque champ les erreurs de validation renvoyées par l'API.
    mutationCache: new MutationCache({ onError: (error) => toast.error(errorMessage(error)) }),
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // Un client par onglet, créé une seule fois (et jamais partagé entre utilisateurs côté serveur).
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
