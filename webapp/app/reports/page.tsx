import type { Metadata } from "next";
import { MyReportsView } from "@/features/reports/views/MyReportsView";

export const metadata: Metadata = { title: "Mes notes" };

export default function ReportsPage() {
  return <MyReportsView />;
}
