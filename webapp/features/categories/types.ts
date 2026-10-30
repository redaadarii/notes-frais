export interface Category {
  code: string;
  label: string;
  /** Plafond par dépense ; null = sans plafond. */
  unitLimit: number | null;
  receiptRequired: boolean;
  glAccount: string;
}
