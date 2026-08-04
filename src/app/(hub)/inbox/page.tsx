import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FeatureSignalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { SignalStatusBadge } from "@/components/hub/status-badge";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const signals = await prisma.featureSignal.findMany({
    where: { status: FeatureSignalStatus.PENDING },
    include: { org: true, channel: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Pending Slack detections waiting to be matched or created as feature requests."
      />

      {signals.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--ink-muted)]">
          No pending signals. Map channels in Settings and wait for customer messages.
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <Link
              key={signal.id}
              href={`/triage/${signal.id}`}
              className="block rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)] hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {signal.aiTitle || "Untitled detection"}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
                    {signal.aiSummary || signal.rawText}
                  </p>
                </div>
                <SignalStatusBadge status={signal.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                <Badge>{signal.org.name}</Badge>
                <Badge>#{signal.channel.name}</Badge>
                {typeof signal.aiConfidence === "number" ? (
                  <Badge>{Math.round(signal.aiConfidence * 100)}% confidence</Badge>
                ) : null}
                <span>
                  {formatDistanceToNow(signal.createdAt, { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
