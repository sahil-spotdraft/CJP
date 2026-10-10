import Link from "next/link";
import { prisma } from "@/lib/db";
import { FeatureRequestStatus, FeatureSignalStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [
    totalSignals,
    pendingSignals,
    matchedSignals,
    dismissedSignals,
    totalRequests,
    newRequests,
    inProgressRequests,
    shippedRequests,
    declinedRequests,
    totalOrgs,
    totalChannels,
    recentSignals,
    topTags,
  ] = await Promise.all([
    prisma.featureSignal.count(),
    prisma.featureSignal.count({ where: { status: FeatureSignalStatus.PENDING } }),
    prisma.featureSignal.count({ where: { status: FeatureSignalStatus.MATCHED } }),
    prisma.featureSignal.count({ where: { status: FeatureSignalStatus.DISMISSED } }),
    prisma.featureRequest.count(),
    prisma.featureRequest.count({ where: { status: FeatureRequestStatus.NEW } }),
    prisma.featureRequest.count({ where: { status: FeatureRequestStatus.IN_PROGRESS } }),
    prisma.featureRequest.count({ where: { status: FeatureRequestStatus.SHIPPED } }),
    prisma.featureRequest.count({ where: { status: FeatureRequestStatus.DECLINED } }),
    prisma.organization.count(),
    prisma.slackChannel.count(),
    prisma.featureSignal.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { org: true, channel: true },
    }),
    prisma.tag.findMany({
      take: 10,
      include: {
        _count: { select: { featureRequests: true } },
      },
      orderBy: { featureRequests: { _count: "desc" } },
    }),
  ]);

  return {
    signals: { total: totalSignals, pending: pendingSignals, matched: matchedSignals, dismissed: dismissedSignals },
    requests: { total: totalRequests, new: newRequests, inProgress: inProgressRequests, shipped: shippedRequests, declined: declinedRequests },
    orgs: totalOrgs,
    channels: totalChannels,
    recentSignals,
    topTags,
  };
}

function MetricCard({ title, value, subtitle, variant }: { title: string; value: number | string; subtitle?: string; variant?: "default" | "pending" | "matched" | "dismissed" | "new" | "progress" | "shipped" | "declined" }) {
  const variantStyles: Record<string, string> = {
    default: "border-[var(--border)]",
    pending: "border-amber-500/30 bg-amber-500/5",
    matched: "border-emerald-500/30 bg-emerald-500/5",
    dismissed: "border-rose-500/30 bg-rose-500/5",
    new: "border-sky-500/30 bg-sky-500/5",
    progress: "border-violet-500/30 bg-violet-500/5",
    shipped: "border-emerald-500/30 bg-emerald-500/5",
    declined: "border-slate-500/30 bg-slate-500/5",
  };

  return (
    <Card className={cn(variantStyles[variant || "default"], "transition hover:shadow-md")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[var(--ink)]">{value}</div>
        {subtitle && <p className="text-xs text-[var(--ink-muted)] mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of feature requests, signals, and team activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Signals" value={metrics.signals.total} variant="default" />
        <MetricCard title="Pending Review" value={metrics.signals.pending} subtitle="Awaiting triage" variant="pending" />
        <MetricCard title="Matched" value={metrics.signals.matched} subtitle="Linked to requests" variant="matched" />
        <MetricCard title="Dismissed" value={metrics.signals.dismissed} subtitle="Not feature requests" variant="dismissed" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Requests" value={metrics.requests.total} variant="default" />
        <MetricCard title="New" value={metrics.requests.new} subtitle="Just created" variant="new" />
        <MetricCard title="In Progress" value={metrics.requests.inProgress} subtitle="Being built" variant="progress" />
        <MetricCard title="Shipped" value={metrics.requests.shipped} subtitle="Delivered" variant="shipped" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Declined" value={metrics.requests.declined} subtitle="Not pursued" variant="declined" />
        <MetricCard title="Organizations" value={metrics.orgs} subtitle="Customer orgs tracked" variant="default" />
        <MetricCard title="Channels" value={metrics.channels} subtitle="Slack channels watched" variant="default" />
        <MetricCard title="Match Rate" value={metrics.signals.total > 0 ? `${Math.round((metrics.signals.matched / metrics.signals.total) * 100)}%` : "0%"} subtitle="Signals matched to requests" variant="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Signals</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.recentSignals.length === 0 ? (
              <p className="text-[var(--ink-muted)] text-center py-8">No signals yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.recentSignals.map((signal) => (
                  <Link key={signal.id} href={`/triage/${signal.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{signal.aiTitle || "Untitled detection"}</p>
                        <p className="text-sm text-[var(--ink-muted)] truncate">{signal.rawText.slice(0, 100)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline">{signal.org.name}</Badge>
                        <Badge variant="outline">#{signal.channel.name}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tags</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.topTags.length === 0 ? (
              <p className="text-[var(--ink-muted)] text-center py-8">No tags yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {metrics.topTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="gap-1">
                    {tag.name}
                    <span className="text-xs opacity-70">({tag._count.featureRequests})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}