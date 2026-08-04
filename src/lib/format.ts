/** Compact currency for KPI / heat maps ($1.2M, $45K). */
export function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** Full currency with grouping. */
export function moneyExact(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

/** STATUS_LIKE → Status Like */
export function readableLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
