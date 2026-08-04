import { prisma } from "@/lib/db";
import { getSlackClient } from "@/lib/slack/client";
import { hasSlack } from "@/lib/env";

export type ExpiryWindow = 30 | 60 | 90;
export type RetentionRiskKind = "EXPIRY" | "DARK";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function sumArr(rows: { arr: number }[]) {
  return rows.reduce((sum, row) => sum + row.arr, 0);
}

export async function getRetentionDashboard(params?: {
  darkThresholdDays?: number;
  csOwner?: string;
}) {
  const darkThresholdDays = params?.darkThresholdDays ?? 30;
  const now = new Date();
  const darkCutoff = new Date(now.getTime() - darkThresholdDays * MS_PER_DAY);

  const orgs = await prisma.customerOrg.findMany({
    ...(params?.csOwner ? { where: { csOwner: params.csOwner } } : {}),
    include: {
      channels: { where: { enabled: true }, take: 1 },
      retentionAlerts: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      activityMetrics: true,
      productRequests: {
        select: { priority: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const accounts = orgs.map((org) => {
    const arr = org.arr ?? 0;
    const daysToExpiry =
      org.contractEndDate != null ? daysBetween(now, org.contractEndDate) : null;
    const daysSinceActivity =
      org.lastActivityAt != null ? daysBetween(org.lastActivityAt, now) : null;

    const expiryWindow: ExpiryWindow | null =
      daysToExpiry == null || daysToExpiry < 0
        ? null
        : daysToExpiry <= 30
          ? 30
          : daysToExpiry <= 60
            ? 60
            : daysToExpiry <= 90
              ? 90
              : null;

    const isDark =
      org.lastActivityAt == null || org.lastActivityAt.getTime() <= darkCutoff.getTime();

    const risks: RetentionRiskKind[] = [];
    if (expiryWindow) risks.push("EXPIRY");
    if (isDark) risks.push("DARK");

    const stoppedCount = org.activityMetrics.filter(
      (metric) => metric.currentCount === 0 && metric.priorCount > 0,
    ).length;
    const decliningCount = org.activityMetrics.filter((metric) => {
      const pct = changePct(metric.currentCount, metric.priorCount);
      return pct <= -15 && !(metric.currentCount === 0 && metric.priorCount > 0);
    }).length;
    const healthyCount = org.activityMetrics.filter((metric) => {
      const pct = changePct(metric.currentCount, metric.priorCount);
      return pct > -15;
    }).length;
    const activityHealthPct = org.activityMetrics.length
      ? (healthyCount / org.activityMetrics.length) * 100
      : isDark
        ? 10
        : 55;
    const criticalOpenAsks = org.productRequests.filter(
      (request) =>
        request.priority === "CRITICAL" &&
        ["NEW", "SHARED_WITH_PRODUCT", "DISCUSSED_WITH_PRODUCT"].includes(
          request.status,
        ),
    ).length;
    const renewal = scoreRenewal({
      isDark,
      daysToExpiry,
      decliningCount,
      stoppedCount,
      criticalOpenAsks,
      activityHealthPct,
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      arr,
      csOwner: org.csOwner ?? "Unassigned",
      contractEndDate: org.contractEndDate?.toISOString() ?? null,
      lastActivityAt: org.lastActivityAt?.toISOString() ?? null,
      daysToExpiry,
      daysSinceActivity,
      expiryWindow,
      isDark,
      risks,
      stoppedCount,
      decliningCount,
      renewalScore: renewal.score,
      renewalBand: renewal.band,
      slackChannelId: org.channels[0]?.channelId ?? null,
      slackChannelName: org.channels[0]?.name ?? null,
      recentAlerts: org.retentionAlerts.map((alert) => ({
        id: alert.id,
        kind: alert.kind,
        message: alert.message,
        createdAt: alert.createdAt.toISOString(),
      })),
    };
  });

  const expiryPipeline = {
    d30: accounts.filter((a) => a.expiryWindow === 30),
    d60: accounts.filter((a) => a.expiryWindow === 60),
    d90: accounts.filter((a) => a.expiryWindow === 90),
  };

  const darkAccounts = accounts
    .filter((a) => a.isDark)
    .sort((a, b) => b.arr - a.arr);

  const atRisk = accounts
    .filter((a) => a.risks.length > 0)
    .sort((a, b) => b.arr - a.arr);

  const recentAlerts = await prisma.retentionAlert.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    include: { org: true },
  });

  return {
    generatedAt: now.toISOString(),
    darkThresholdDays,
    totals: {
      accounts: accounts.length,
      atRisk: atRisk.length,
      atRiskArr: sumArr(atRisk),
      expiry30: expiryPipeline.d30.length,
      expiry30Arr: sumArr(expiryPipeline.d30),
      expiry60: expiryPipeline.d60.length,
      expiry60Arr: sumArr(expiryPipeline.d60),
      expiry90: expiryPipeline.d90.length,
      expiry90Arr: sumArr(expiryPipeline.d90),
      dark: darkAccounts.length,
      darkArr: sumArr(darkAccounts),
    },
    story: {
      title: "Silent churn near-miss",
      body: `Dark accounts currently represent ${money(sumArr(darkAccounts))} ARR with no recent product activity — the class of silent risk that used to go unnoticed until renewal was nearly lost (baseline near-miss: $128K).`,
    },
    expiryPipeline,
    darkAccounts,
    atRisk,
    accounts,
    csOwners: [...new Set(accounts.map((a) => a.csOwner))].sort(),
    nudgeTemplates: [
      {
        id: "expiry-30",
        label: "Renewal check-in (30 days)",
        channel: "email",
        subject: "Quick renewal check-in",
        body: "Hi {{account}} team — your contract renews in about {{days}} days. Want to schedule a short renewal + roadmap review this week?",
      },
      {
        id: "expiry-60",
        label: "Value review (60 days)",
        channel: "email",
        subject: "Value review before renewal",
        body: "Hi {{account}} — we're about {{days}} days from renewal. Happy to walk through adoption wins and any blockers before paperwork.",
      },
      {
        id: "dark-30",
        label: "Re-engagement nudge (dark account)",
        channel: "email",
        subject: "Checking in — anything blocking usage?",
        body: "Hi {{account}} — we noticed lower recent activity and wanted to check whether anything is blocking the team. Open to a quick 15-min sync?",
      },
      {
        id: "slack-owner",
        label: "Slack CSM alert",
        channel: "slack",
        subject: "Retention risk alert",
        body: "⚠️ Retention risk on *{{account}}* ({{arr}} ARR, owner {{owner}}). Flags: {{flags}}. Suggested next step: send outreach today.",
      },
    ],
    recentAlerts: recentAlerts.map((alert) => ({
      id: alert.id,
      kind: alert.kind,
      message: alert.message,
      channel: alert.channel,
      createdAt: alert.createdAt.toISOString(),
      orgName: alert.org.name,
      orgId: alert.orgId,
    })),
  };
}

export type RetentionDashboard = Awaited<ReturnType<typeof getRetentionDashboard>>;
export type RetentionAccount = RetentionDashboard["accounts"][number];

export async function sendRetentionSlackAlert(params: {
  orgId: string;
  createdBy?: string;
  channelOverride?: string;
}) {
  const org = await prisma.customerOrg.findUnique({
    where: { id: params.orgId },
    include: { channels: { where: { enabled: true }, take: 1 } },
  });
  if (!org) throw new Error("Account not found");

  const dashboard = await getRetentionDashboard();
  const account = dashboard.accounts.find((row) => row.id === org.id);
  if (!account) throw new Error("Account not found in retention view");
  if (!account.risks.length) throw new Error("Account is not currently flagged as at-risk");

  const flags = [
    account.expiryWindow ? `expiry ${account.expiryWindow}d` : null,
    account.isDark ? `dark ${account.daysSinceActivity ?? "n/a"}d` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const message =
    `⚠️ Retention risk on *${account.name}* (${money(account.arr)} ARR, owner ${account.csOwner}). ` +
    `Flags: ${flags}. Suggested next step: send a re-engagement or renewal outreach today.`;

  const channel =
    params.channelOverride ||
    org.channels[0]?.channelId ||
    process.env.RETENTION_SLACK_CHANNEL ||
    null;

  let delivered = false;
  if (channel && hasSlack()) {
    const slack = getSlackClient();
    if (slack) {
      await slack.chat.postMessage({
        channel,
        text: message,
        unfurl_links: false,
        unfurl_media: false,
      });
      delivered = true;
    }
  }

  const alert = await prisma.retentionAlert.create({
    data: {
      orgId: org.id,
      kind: account.isDark ? "DARK" : "EXPIRY",
      channel: channel ?? "local-log",
      message: delivered
        ? message
        : `${message} (logged locally — Slack not configured or channel missing)`,
      createdBy: params.createdBy ?? null,
    },
  });

  return { alert, delivered, channel };
}

export async function triggerRetentionNudge(params: {
  orgId: string;
  templateId: string;
  createdBy?: string;
}) {
  const dashboard = await getRetentionDashboard();
  const account = dashboard.accounts.find((row) => row.id === params.orgId);
  if (!account) throw new Error("Account not found");

  const template = dashboard.nudgeTemplates.find((t) => t.id === params.templateId);
  if (!template) throw new Error("Unknown nudge template");

  const rendered = template.body
    .replaceAll("{{account}}", account.name)
    .replaceAll("{{days}}", String(account.daysToExpiry ?? "N/A"))
    .replaceAll("{{arr}}", money(account.arr))
    .replaceAll("{{owner}}", account.csOwner)
    .replaceAll(
      "{{flags}}",
      account.risks.length ? account.risks.join(", ") : "manual outreach",
    );

  const subject = template.subject.replaceAll("{{account}}", account.name);

  const alert = await prisma.retentionAlert.create({
    data: {
      orgId: account.id,
      kind: "NUDGE",
      channel: template.channel,
      message: `${subject}\n\n${rendered}`,
      createdBy: params.createdBy ?? null,
    },
  });

  return {
    alert,
    template,
    subject,
    body: rendered,
  };
}

function changePct(current: number, prior: number) {
  if (prior === 0) return current > 0 ? 100 : 0;
  return ((current - prior) / prior) * 100;
}

function scoreRenewal(input: {
  isDark: boolean;
  daysToExpiry: number | null;
  decliningCount: number;
  stoppedCount: number;
  criticalOpenAsks: number;
  activityHealthPct: number;
}) {
  let score = 72;

  if (input.isDark) score -= 28;
  if (input.daysToExpiry != null && input.daysToExpiry <= 30) score -= 12;
  else if (input.daysToExpiry != null && input.daysToExpiry <= 60) score -= 6;

  score -= Math.min(input.decliningCount * 4, 20);
  score -= Math.min(input.stoppedCount * 8, 24);
  score -= Math.min(input.criticalOpenAsks * 6, 18);
  score += Math.round((input.activityHealthPct - 50) / 5);

  score = Math.max(5, Math.min(97, score));

  const band =
    score >= 70 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";

  return { score, band };
}

export async function getWorkspaceRetentionDetail(orgId: string) {
  const now = new Date();
  const darkThresholdDays = 30;
  const darkCutoff = new Date(now.getTime() - darkThresholdDays * MS_PER_DAY);

  const org = await prisma.customerOrg.findUnique({
    where: { id: orgId },
    include: {
      activityMetrics: { orderBy: { label: "asc" } },
      productRequests: {
        include: { consolidation: true },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      },
      channels: { where: { enabled: true }, take: 3 },
      retentionAlerts: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!org) return null;

  const daysToExpiry =
    org.contractEndDate != null ? daysBetween(now, org.contractEndDate) : null;
  const daysSinceActivity =
    org.lastActivityAt != null ? daysBetween(org.lastActivityAt, now) : null;
  const isDark =
    org.lastActivityAt == null || org.lastActivityAt.getTime() <= darkCutoff.getTime();

  const activities = org.activityMetrics.map((metric) => {
    const delta = metric.currentCount - metric.priorCount;
    const pct = changePct(metric.currentCount, metric.priorCount);
    const status =
      metric.currentCount === 0 && metric.priorCount > 0
        ? "STOPPED"
        : pct <= -40
          ? "SHARPLY_REDUCED"
          : pct <= -15
            ? "REDUCED"
            : pct >= 15
              ? "INCREASED"
              : "STABLE";

    return {
      key: metric.activityKey,
      label: metric.label,
      currentCount: metric.currentCount,
      priorCount: metric.priorCount,
      periodDays: metric.periodDays,
      delta,
      changePct: pct,
      status,
    };
  });

  const stopped = activities.filter((a) => a.status === "STOPPED");
  const reduced = activities.filter(
    (a) => a.status === "REDUCED" || a.status === "SHARPLY_REDUCED",
  );
  const healthy = activities.filter(
    (a) => a.status === "STABLE" || a.status === "INCREASED",
  );

  const openStatuses = new Set([
    "NEW",
    "SHARED_WITH_PRODUCT",
    "DISCUSSED_WITH_PRODUCT",
  ]);

  const featureAsks = org.productRequests.map((request) => ({
    id: request.id,
    ask: request.ask,
    consolidation: request.consolidation?.name ?? "Unconsolidated",
    feature: request.consolidation?.feature ?? "Not specified",
    priority: request.priority ?? "NOT_SET",
    status: request.status,
    open: openStatuses.has(request.status),
    expectation:
      request.productNotes ||
      request.csNotes ||
      request.timeline ||
      "No explicit expectation captured yet",
  }));

  const criticalOpenAsks = featureAsks.filter(
    (ask) => ask.open && ask.priority === "CRITICAL",
  ).length;

  const activityHealthPct = activities.length
    ? (healthy.length / activities.length) * 100
    : isDark
      ? 10
      : 55;

  const renewal = scoreRenewal({
    isDark,
    daysToExpiry,
    decliningCount: reduced.length,
    stoppedCount: stopped.length,
    criticalOpenAsks,
    activityHealthPct,
  });

  const expectations = [
    ...featureAsks
      .filter((ask) => ask.open)
      .slice(0, 5)
      .map((ask) => ({
        kind: "FEATURE" as const,
        title: ask.consolidation,
        detail: ask.ask,
        priority: ask.priority,
      })),
    ...(daysToExpiry != null && daysToExpiry <= 90
      ? [
          {
            kind: "RENEWAL" as const,
            title: "Contract renewal conversation",
            detail: `Contract ends in ${daysToExpiry} days. Customer expects clarity on roadmap commitments tied to renewal.`,
            priority: daysToExpiry <= 30 ? "CRITICAL" : "HIGH",
          },
        ]
      : []),
    ...(stopped.length
      ? [
          {
            kind: "ADOPTION" as const,
            title: "Restore dropped workflows",
            detail: `Usage stopped on: ${stopped.map((s) => s.label).join(", ")}.`,
            priority: "HIGH",
          },
        ]
      : []),
  ];

  return {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      arr: org.arr ?? 0,
      csOwner: org.csOwner ?? "Unassigned",
      contractEndDate: org.contractEndDate?.toISOString() ?? null,
      lastActivityAt: org.lastActivityAt?.toISOString() ?? null,
      daysToExpiry,
      daysSinceActivity,
      isDark,
    },
    renewal: {
      ...renewal,
      label:
        renewal.band === "HIGH"
          ? "High chance to renew"
          : renewal.band === "MEDIUM"
            ? "Medium chance to renew"
            : "Low chance to renew",
      summary:
        renewal.band === "HIGH"
          ? "Healthy enough usage and manageable open asks — protect with a normal renewal motion."
          : renewal.band === "MEDIUM"
            ? "Some adoption decline or open asks — run a value + roadmap review before renewal."
            : "Dark/declining usage and/or critical unmet asks — treat as churn risk and intervene now.",
    },
    activity: {
      periodDays: activities[0]?.periodDays ?? 30,
      rows: activities,
      stopped,
      reduced,
      healthy,
    },
    featureAsks,
    expectations,
    channels: org.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      channelId: channel.channelId,
    })),
    recentAlerts: org.retentionAlerts.map((alert) => ({
      id: alert.id,
      kind: alert.kind,
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
    })),
  };
}

export type WorkspaceRetentionDetail = NonNullable<
  Awaited<ReturnType<typeof getWorkspaceRetentionDetail>>
>;

