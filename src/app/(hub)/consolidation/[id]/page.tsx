import Link from "next/link";
import { notFound } from "next/navigation";
import { getConsolidationDetail } from "@/lib/services/consolidation";
import { Badge } from "@/components/ui/badge";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";
import { PromoteToFeatureRequestButton } from "@/components/hub/consolidation-detail-client";

export const dynamic = "force-dynamic";

function formatArr(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

export default async function ConsolidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getConsolidationDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">{detail.name}</h1>
            {detail.feature ? <p className="mt-1 text-[var(--ink-muted)]">{detail.feature}</p> : null}
            {detail.notes ? <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">{detail.notes}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">SUM of Account ARR</p>
            <p className="text-2xl font-semibold">{formatArr(detail.arr)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>{detail.requests.length} requests</Badge>
          <Badge>{detail.orgs.length} workspaces</Badge>
          {detail.orgs.map((org) => (
            <Badge key={org.id}>{org.name}</Badge>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          {detail.featureRequest ? (
            <Link href={`/requests/${detail.featureRequest.id}`} className="text-sm text-[var(--accent)] underline">
              View linked feature request: {detail.featureRequest.title}
            </Link>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Not yet linked to a canonical feature request.</p>
          )}
          {!detail.featureRequest ? <PromoteToFeatureRequestButton /> : null}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Feature requests</h2>
        {detail.requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-2xl font-medium">{request.ask}</p>
              <div className="flex items-center gap-2">
                <ClmStatusBadge status={request.status} />
                {request.priority ? <ClmPriorityBadge priority={request.priority} /> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge>WS Name: {request.org.name}</Badge>
              <Badge>Account ARR: {formatArr(request.org.arr)}</Badge>
              {request.csOwner ? <Badge>CS: {request.csOwner.name}</Badge> : null}
              {request.timeline ? <Badge>{request.timeline}</Badge> : null}
            </div>
          </div>
        ))}
        {detail.requests.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No product requests linked yet.</p>
        ) : null}
      </section>
    </div>
  );
}
