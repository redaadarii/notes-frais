import "server-only";
import type { CurrentUser } from "@/features/auth/types";
import { requirePermission } from "@/server/auth/authorization";
import type { Employee } from "../types";
import * as repository from "./repository";

export function listEmployees(user: CurrentUser): Promise<Employee[]> {
  requirePermission(user, "employee:read");
  return repository.listEmployees();
}
