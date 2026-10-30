import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title = "Chargement impossible", onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
