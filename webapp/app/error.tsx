"use client";

import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";

/** Error Boundary des pages : une erreur de rendu n'emporte pas le menu, et l'utilisateur peut réessayer. */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] erreur de rendu", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertCircleIcon}
      title="Cette page a rencontré un problème"
      description={error.digest ? `Référence de l'erreur : ${error.digest}` : undefined}
      action={<Button onClick={reset}>Réessayer</Button>}
    />
  );
}
