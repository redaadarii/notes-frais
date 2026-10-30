import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  href?: string;
}

export function StatCard({ title, value, detail, icon: Icon, href }: StatCardProps) {
  const card = (
    <Card className="hover:bg-muted/50 h-full transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" aria-hidden />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="focus-visible:ring-ring/50 rounded-xl focus-visible:ring-3 focus-visible:outline-none"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
