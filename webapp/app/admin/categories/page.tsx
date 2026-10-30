import type { Metadata } from "next";
import { CategoriesAdminView } from "@/features/categories/views/CategoriesAdminView";

export const metadata: Metadata = { title: "Catégories" };

export default function CategoriesPage() {
  return <CategoriesAdminView />;
}
