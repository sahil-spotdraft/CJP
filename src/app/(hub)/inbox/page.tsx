import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FeatureSignalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { SignalStatusBadge } from "@/components/hub/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface InboxPageProps {
  searchParams: Promise<{
    search?: string;
    orgId?: string;
    sort?: "newest" | "oldest" | "confidence";
  }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { search, orgId, sort = "newest" } = await searchParams;

  const where: { status: FeatureSignalStatus; orgId?: string; OR?: Array<{ aiTitle?: { contains: string; mode: "insensitive" }; aiSummary?: { contains: string; mode: "insensitive" }; rawText?: { contains: string; mode: "insensitive" }> } } = {
    status: FeatureSignalStatus.PENDING,
  };

  if (orgId) where.orgId = orgId;
  if (search) {
    where.OR = [
      { aiTitle: { contains: search, mode: "insensitive" } },
      { aiSummary: { contains: search, mode: "insensitive" } },
      { rawText: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "confidence"
      ? { aiConfidence: "desc" as const }
      : { createdAt: "desc" as const };

  const [signals, orgs] = await Promise.all([
    prisma.featureSignal.findMany({
      where,
      include: { org: true, channel: true },
      orderBy,
      take: 50,
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Pending Slack detections waiting to be matched or created as feature requests."
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search title, summary, or raw text..."
          value={search || ""}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            if (e.target.value) params.set("search", e.target.value);
            else params.delete("search");
            params.delete("page");
            window.location.search = params.toString();
          }}
          className="max-w-xs"
        />
        <Select
          value={orgId || ""}
          onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search);
            if (value) params.set("orgId", value);
            else params.delete("orgId");
            params.delete("page");
            window.location.search = params.toString();
          }}
          className="max-w-xs"
        >
          <Select.Trigger className="w-full">
            <Select.Value placeholder="Filter by organization" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">All organizations</Select.Item>
            {orgs.map((org) => (
              <Select.Item key={org.id} value={org.id}>
                {org.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search);
            params.set("sort", value);
            params.delete("page");
            window.location.search = params.toString();
          }}
          className="max-w-xs"
        >
          <Select.Trigger className="w-full">
            <Select.Value placeholder="Sort" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="newest">Newest first</Select.Item>
            <Select.Item value="oldest">Oldest first</Select.Item>
            <Select.Item value="confidence">Highest confidence</Select.Item>
          </Select.Content>
        </Select>
      </div>

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
