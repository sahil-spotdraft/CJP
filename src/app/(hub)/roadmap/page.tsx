import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { RoadmapCreateForm } from "@/components/hub/roadmap-create-form";
import { RequestStatusBadge } from "@/components/hub/status-badge";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const items = await prisma.roadmapItem.findMany({
    include: {
      requests: {
        include: {
          _count: { select: { votes: true, signals: true } },
        },
      },
    },
    orderBy: [{ quarter: "asc" }, { title: "asc" }],
  });

  const unassigned = await prisma.featureRequest.findMany({
    where: { roadmapId: null },
    include: { _count: { select: { votes: true, signals: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Roadmap</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Group canonical feature requests into themes and quarters.
        </p>
      </div>

      <RoadmapCreateForm />

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <section
            key={item.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              {item.quarter ? <Badge>{item.quarter}</Badge> : null}
            </div>
            {item.theme ? <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.theme}</p> : null}
            {item.description ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{item.description}</p>
            ) : null}
            <div className="mt-4 space-y-2">
              {item.requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm hover:bg-[var(--accent-soft)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{request.title}</span>
                    <RequestStatusBadge status={request.status} />
                  </div>
                  <div className="mt-1 text-xs text-[var(--ink-muted)]">
                    {request._count.votes} votes · {request._count.signals} signals
                  </div>
                </Link>
              ))}
              {item.requests.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No requests assigned yet.</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold">Unassigned</h2>
        <div className="mt-3 space-y-2">
          {unassigned.map((request) => (
            <Link
              key={request.id}
              href={`/requests/${request.id}`}
              className="block rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              {request.title}
            </Link>
          ))}
          {unassigned.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">All requests are on the roadmap.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
