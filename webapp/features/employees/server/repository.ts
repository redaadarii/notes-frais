import "server-only";
import { query } from "@/server/databricks/sql";
import type { Employee } from "../types";

export const listEmployees = () =>
  query<Employee>(
    `SELECT e.email, e.full_name AS fullName, e.manager_email AS managerEmail, m.full_name AS managerName,
            e.cost_center AS costCenter, e.active, coalesce(d.n, 0) AS directReports
     FROM employees e
     LEFT JOIN employees m ON m.email = e.manager_email
     LEFT JOIN (SELECT manager_email, COUNT(*) AS n FROM employees WHERE active GROUP BY manager_email) d
            ON d.manager_email = e.email
     ORDER BY e.active DESC, e.full_name`,
  );
