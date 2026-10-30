import type { Metadata } from "next";
import { EmployeesView } from "@/features/employees/views/EmployeesView";

export const metadata: Metadata = { title: "Collaborateurs" };

export default function EmployeesPage() {
  return <EmployeesView />;
}
