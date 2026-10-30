/** Mise en forme française des montants, dates et périodes. */

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const month = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export const formatMoney = (amount: number) => money.format(amount);

/** « 2026-10-15 » → « 15 oct. 2026 » (date sans heure : lue en UTC pour ne jamais décaler d'un jour). */
export const formatDate = (isoDate: string) => day.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));

export const formatDateTime = (isoTimestamp: string) => dateTime.format(new Date(isoTimestamp));

/** « 2026-10 » → « octobre 2026 ». */
export const formatPeriod = (period: string) => month.format(new Date(`${period}-01T00:00:00Z`));

/** Mois courant au format AAAA-MM. */
export function currentPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Les N derniers mois, du plus récent au plus ancien (listes de choix de période). */
export function recentPeriods(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    currentPeriod(new Date(now.getFullYear(), now.getMonth() - i, 1)),
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
