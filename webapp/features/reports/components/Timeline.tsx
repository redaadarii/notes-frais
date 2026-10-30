import { formatDateTime } from "@/lib/format";
import { ACTION_LABELS, STATUS_LABELS } from "../labels";
import type { ReportEvent } from "../types";

/** Historique d'audit de la note : qui a fait quoi, quand. */
export function Timeline({ events }: { events: ReportEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className="bg-primary ring-card absolute top-1.5 -left-[1.82rem] size-2.5 rounded-full ring-4"
            aria-hidden
          />
          <p className="text-sm font-medium">
            {ACTION_LABELS[event.action as keyof typeof ACTION_LABELS] ?? event.action}
            {event.toStatus && (
              <span className="text-muted-foreground font-normal"> → {STATUS_LABELS[event.toStatus]}</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {event.actor} · {formatDateTime(event.createdAt)}
          </p>
          {event.comment && <p className="mt-1 text-sm italic">« {event.comment} »</p>}
        </li>
      ))}
    </ol>
  );
}
