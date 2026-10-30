import { FileQuestionIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestionIcon}
      title="Page introuvable"
      description="L'adresse demandée n'existe pas."
      action={
        <Button asChild>
          <Link href="/">Retour au tableau de bord</Link>
        </Button>
      }
    />
  );
}
