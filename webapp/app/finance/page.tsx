import type { Metadata } from "next";
import { FinanceView } from "@/features/exports/views/FinanceView";

export const metadata: Metadata = { title: "Finance" };

export default function FinancePage() {
  return <FinanceView />;
}
