import "server-only";
import { hasPermission } from "@/features/auth/roles";
import type { CurrentUser } from "@/features/auth/types";
import { query, queryOne } from "@/server/databricks/sql";
import { sql } from "@/server/databricks/sql-params";
import type { Dashboard, StatusCount } from "../types";

const mine = (email: string) =>
  query<StatusCount>(
    `SELECT status, COUNT(*) AS count, coalesce(SUM(total_amount), 0) AS amount
     FROM expense_reports WHERE employee_email = :email GROUP BY status`,
    { email: sql.string(email) },
  );

async function team(email: string) {
  const row = await queryOne<{ pendingCount: number; pendingAmount: number }>(
    `SELECT COUNT(*) AS pendingCount, coalesce(SUM(total_amount), 0) AS pendingAmount
     FROM expense_reports WHERE manager_email = :email AND status = 'SUBMITTED'`,
    { email: sql.string(email) },
  );
  return row ?? { pendingCount: 0, pendingAmount: 0 };
}

async function finance() {
  const row = await queryOne<NonNullable<Dashboard["finance"]>>(
    `SELECT count_if(status = 'MANAGER_APPROVED') AS pendingCount,
            coalesce(SUM(CASE WHEN status = 'MANAGER_APPROVED' THEN total_amount END), 0) AS pendingAmount,
            count_if(status = 'APPROVED') AS toExportCount,
            coalesce(SUM(CASE WHEN status = 'APPROVED' THEN total_amount END), 0) AS toExportAmount
     FROM expense_reports WHERE status IN ('MANAGER_APPROVED', 'APPROVED')`,
  );
  return row ?? { pendingCount: 0, pendingAmount: 0, toExportCount: 0, toExportAmount: 0 };
}

/** Les requêtes des différents blocs partent en parallèle. */
export async function getDashboard(user: CurrentUser): Promise<Dashboard> {
  const [mineBlock, teamBlock, financeBlock] = await Promise.all([
    hasPermission(user, "report:create") ? mine(user.email) : null,
    hasPermission(user, "report:approve:manager") ? team(user.email) : null,
    hasPermission(user, "report:approve:finance") ? finance() : null,
  ]);
  return { mine: mineBlock, team: teamBlock, finance: financeBlock };
}
