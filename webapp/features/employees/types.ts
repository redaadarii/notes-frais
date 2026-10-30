export interface Employee {
  email: string;
  fullName: string;
  managerEmail: string | null;
  managerName: string | null;
  costCenter: string;
  active: boolean;
  /** Nombre de collaborateurs dont il est le manager direct. */
  directReports: number;
}
