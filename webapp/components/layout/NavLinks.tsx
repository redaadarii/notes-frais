"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentUser } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS } from "./navigation";

export function NavLinks({ user, onNavigate }: { user: CurrentUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.permission || user.permissions.includes(item.permission));

  return (
    <nav aria-label="Navigation principale" className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
