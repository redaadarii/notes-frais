import type { Metadata } from "next";
import { NewReportView } from "@/features/reports/views/NewReportView";

export const metadata: Metadata = { title: "Nouvelle note" };

export default function NewReportPage() {
  return <NewReportView />;
}
