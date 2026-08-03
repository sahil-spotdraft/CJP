import { Suspense } from "react";
import { getAnalytics, type AnalyticsLens } from "@/lib/services/analytics";
import { AnalyticsDashboard } from "@/components/hub/analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ lens?: string; csOwner?: string }>;
}) {
  const params = await searchParams;
  const lens = (["global", "csm", "pm"].includes(params.lens || "")
    ? params.lens
    : "global") as AnalyticsLens;
  const data = await getAnalytics(lens, params.csOwner || undefined);

  return (
    <Suspense fallback={<p className="text-[var(--ink-muted)]">Loading analytics…</p>}>
      <AnalyticsDashboard data={data} />
    </Suspense>
  );
}
