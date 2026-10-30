import { ShieldXIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function Forbidden({ message = "Cette page est réservée à d'autres rôles." }: { message?: string }) {
  return <EmptyState icon={ShieldXIcon} title="Accès refusé" description={message} />;
}
