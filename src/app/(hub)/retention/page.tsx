import { Suspense } from "react";
import { getRetentionDashboard } from "@/lib/services/retention";
import { RetentionDashboard } from "@/components/hub/retention-dashboard";

export const dynamic = "force-dynamic";

export default async function RetentionPage({
  searchParams,
}: {
  searchParams: Promise<{ csOwner?: string; darkDays?: string }>;
}) {
  const params = await searchParams;
  const darkThresholdDays = Number(params.darkDays || 30);
  const data = await getRetentionDashboard({
    csOwner: params.csOwner || undefined,
    darkThresholdDays: Number.isFinite(darkThresholdDays) ? darkThresholdDays : 30,
  });

  return (
    <Suspense fallback={<p className="text-[var(--ink-muted)]">Loading retention…</p>}>
      <RetentionDashboard data={data} />
    </Suspense>
  );
}
