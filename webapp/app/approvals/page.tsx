import type { Metadata } from "next";
import { ApprovalQueueView } from "@/features/reports/views/ApprovalQueueView";

export const metadata: Metadata = { title: "À valider" };

export default function ApprovalsPage() {
  return <ApprovalQueueView />;
}
