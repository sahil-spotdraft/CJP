import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ChannelCreateForm } from "@/components/hub/channel-create-form";
import { OrgArrEditor } from "@/components/hub/org-arr-editor";
import { RequestStatusBadge, SignalStatusBadge } from "@/components/hub/status-badge";

export const dynamic = "force-dynamic";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await prisma.customerOrg.findUnique({
    where: { id },
    include: {
      channels: true,
      signals: {
        include: { channel: true, featureRequest: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!org) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">{org.name}</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Workspace slug: {org.slug} · WS ID: <span className="font-mono">{org.id}</span>
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-semibold">Account ARR</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Drives the ARR rollup shown on the Consolidation view for every feature this workspace asks for.
        </p>
        <div className="mt-4">
          <OrgArrEditor orgId={org.id} initialArr={org.arr} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-semibold">Slack channels</h2>
        <div className="mt-4 space-y-2">
          {org.channels.map((channel) => (
            <div
              key={channel.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">#{channel.name}</span>
                <span className="ml-2 text-[var(--ink-muted)]">{channel.channelId}</span>
              </div>
              <Badge className={channel.enabled ? "bg-emerald-100 text-emerald-800" : ""}>
                {channel.enabled ? "Watching" : "Paused"}
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <ChannelCreateForm orgId={org.id} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent signals</h2>
        {org.signals.map((signal) => (
          <div
            key={signal.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{signal.aiTitle || "Untitled"}</div>
              <SignalStatusBadge status={signal.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{signal.aiSummary || signal.rawText}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>#{signal.channel.name}</Badge>
              {signal.featureRequest ? (
                <Link
                  href={`/requests/${signal.featureRequest.id}`}
                  className="text-sm text-[var(--accent)] underline"
                >
                  {signal.featureRequest.title}
                </Link>
              ) : (
                <Link href={`/triage/${signal.id}`} className="text-sm text-[var(--accent)] underline">
                  Open triage
                </Link>
              )}
              {signal.featureRequest ? (
                <RequestStatusBadge status={signal.featureRequest.status} />
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
