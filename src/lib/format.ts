import { format } from "date-fns";

/** Compact currency for KPI / heat maps ($1.2M, $45K). */
export function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Full currency with grouping. */
export function moneyExact(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Stable date for SSR/hydration (avoid bare toLocaleDateString). */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

/** Stable date+time for SSR/hydration. */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy h:mm a");
}

/** STATUS_LIKE → Status Like */
export function readableLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
