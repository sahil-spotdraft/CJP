import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "@/components/hub/status-badge";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const requests = await prisma.featureRequest.findMany({
    include: {
      tags: { include: { tag: true } },
      votes: true,
      signals: { include: { org: true } },
      productRequests: { include: { org: true } },
      consolidation: {
        include: { requests: { include: { org: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Feature requests</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Canonical requests aggregated across customer workspaces.
        </p>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const orgs = [
            ...new Map(
              [
                ...request.signals.map((s) => s.org),
                ...request.productRequests.map((p) => p.org),
                ...(request.consolidation?.requests.map((r) => r.org) ?? []),
              ].map((org) => [org.id, org]),
            ).values(),
          ];
          return (
            <Link
              key={request.id}
              href={`/requests/${request.id}`}
              className="block rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{request.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
                    {request.summary}
                  </p>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{request.votes.length} votes</Badge>
                <Badge>{orgs.length} workspaces</Badge>
                {orgs.map((org) => (
                  <Badge key={org.id}>{org.name}</Badge>
                ))}
                {request.tags.map((t) => (
                  <Badge key={t.tagId} className="bg-[var(--accent-soft)] text-[var(--accent)]">
                    {t.tag.name}
                  </Badge>
                ))}
              </div>
            </Link>
          );
        })}
        {requests.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] p-10 text-center text-[var(--ink-muted)]">
            No feature requests yet. Triage a Slack signal to create one.
          </div>
        ) : null}
      </div>
    </div>
  );
}
