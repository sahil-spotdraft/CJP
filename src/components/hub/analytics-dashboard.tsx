"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, Stat } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  priorityChartColors,
  statusChartColors,
} from "@/components/hub/status-badge";
import { money, readableLabel } from "@/lib/format";

type RequestDetail = {
  id: string;
  account: string;
  ask: string;
  consolidation: string;
  feature: string;
  arr: number;
  priority: string;
  status: string;
  csOwner: string;
};

type AnalyticsData = {
  lens: string;
  csOwner: string | null;
  totals: {
    requests: number;
    accounts: number;
    uniqueBacklogArr: number;
    requestWeightedArr: number;
    roadmapUniqueArr: number;
    uncoveredArr: number;
    opportunityPrize: number;
    revenueAtRisk: number;
    criticalWeightedArr: number;
    critical: number;
    neu: number;
    neuPct: number;
    arrCoveragePct: number;
    potentialCoveragePct: number;
    triageHealth: number;
  };
  insights: {
    topPrize: {
      theme: string;
      feature: string;
      accounts: number;
      uniqueArr: number;
      prize: number;
      inRoadmap: boolean;
      formula: string;
    } | null;
    gapCount: number;
    emergingCount: number;
    analysis: { title: string; body: string }[];
  };
  funnel: {
    status: string;
    count: number;
    uniqueArr: number;
    weightedArr: number;
    pct: number;
  }[];
  priorityMix: { priority: string; count: number }[];
  gapBoard: {
    theme: string;
    feature: string;
    accounts: number;
    asks: number;
    uniqueArr: number;
    prize: number;
    critical: number;
    formula: string;
  }[];
  emergingGaps: {
    theme: string;
    feature: string;
    accounts: number;
    uniqueArr: number;
    prize: number;
    critical: number;
  }[];
  themeScores: {
    theme: string;
    feature: string;
    accounts: number;
    asks: number;
    uniqueArr: number;
    prize: number;
    score: number;
    inRoadmap: boolean;
    critical: number;
    formula: string;
  }[];
  roadmapThemes: {
    theme: string;
    feature: string;
    accounts: number;
    asks: number;
    uniqueArr: number;
    prize: number;
  }[];
  criticalNew: {
    id: string;
    account: string;
    arr: number | null;
    theme: string;
    csOwner: string | null;
    status?: string;
    ask?: string;
  }[];
  accountHeat: {
    name: string;
    arr: number;
    asks: number;
    critical: number;
    neu: number;
    heat: number;
  }[];
  csmLoad: {
    owner: string;
    asks: number;
    critical: number;
    neu: number;
    accounts: number;
  }[];
  epicClusters: {
    epic: string;
    themes: number;
    asks: number;
    accounts: number;
    uniqueArr: number;
    prize: number;
  }[];
  requestDetails: RequestDetail[];
  csOwners: string[];
};

type DetailFilter = {
  kind: "all" | "status" | "priority" | "consolidation";
  value?: string;
  label: string;
};

type MetricKey =
  | "requests"
  | "coverage"
  | "opportunity"
  | "risk"
  | "triage"
  | "uncovered"
  | "potential"
  | "voice";

type MetricInsight = {
  key: MetricKey;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
  formula: string;
  steps: string[];
  meaning: string;
  rows: RequestDetail[];
  rowLabel: string;
};

function pctLabel(n: number) {
  return `${Math.round(n)}%`;
}

const LENS_COPY: Record<MetricKey, string> = {
  requests: "Showing the full backlog for this lens",
  coverage: "Lens: consolidations already In Roadmap",
  opportunity: "Lens: multi-account gaps not on roadmap (≥3 accounts)",
  risk: "Lens: Critical requests still needing a Product decision",
  triage: "Lens: requests still in New",
  uncovered: "Lens: requests not covered by roadmap consolidations",
  potential: "Lens: roadmap consolidations plus current opportunity gaps",
  voice: "Lens: full backlog — compare weighted voice vs unique ARR",
};

function rebuildFunnel(rows: RequestDetail[]) {
  const order = [
    "NEW",
    "SHARED_WITH_PRODUCT",
    "DISCUSSED_WITH_PRODUCT",
    "IN_ROADMAP",
    "CLOSED",
    "PLANNED",
    "IN_PROGRESS",
    "SHIPPED",
    "DECLINED",
  ];
  const buckets = new Map<
    string,
    { count: number; orgs: Map<string, number> }
  >();
  for (const row of rows) {
    const bucket = buckets.get(row.status) ?? { count: 0, orgs: new Map() };
    bucket.count += 1;
    bucket.orgs.set(row.account, row.arr);
    buckets.set(row.status, bucket);
  }
  return order.flatMap((status) => {
    const bucket = buckets.get(status);
    if (!bucket) return [];
    const uniqueArr = [...bucket.orgs.values()].reduce((a, b) => a + b, 0);
    return [
      {
        status,
        count: bucket.count,
        uniqueArr,
        weightedArr: uniqueArr,
        pct: rows.length ? (bucket.count / rows.length) * 100 : 0,
      },
    ];
  });
}

function rebuildPriorityMix(rows: RequestDetail[]) {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NOT_SET"];
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.priority, (counts.get(row.priority) ?? 0) + 1);
  }
  return order
    .map((priority) => ({ priority, count: counts.get(priority) ?? 0 }))
    .filter((item) => item.count > 0);
}

function rebuildAccountHeat(rows: RequestDetail[]) {
  const map = new Map<
    string,
    { name: string; arr: number; asks: number; critical: number; neu: number }
  >();
  for (const row of rows) {
    const account = map.get(row.account) ?? {
      name: row.account,
      arr: row.arr,
      asks: 0,
      critical: 0,
      neu: 0,
    };
    account.asks += 1;
    if (row.priority === "CRITICAL") account.critical += 1;
    if (row.status === "NEW") account.neu += 1;
    map.set(row.account, account);
  }
  return [...map.values()]
    .map((account) => ({
      ...account,
      heat: account.asks * account.arr,
    }))
    .sort((a, b) => b.heat - a.heat || b.arr - a.arr)
    .slice(0, 8);
}

type MetricLensView = {
  label: string | null;
  rows: RequestDetail[];
  funnel: AnalyticsData["funnel"];
  priorityMix: AnalyticsData["priorityMix"];
  gapBoard: AnalyticsData["gapBoard"];
  themeScores: AnalyticsData["themeScores"];
  emergingGaps: AnalyticsData["emergingGaps"];
  roadmapThemes: AnalyticsData["roadmapThemes"];
  criticalNew: AnalyticsData["criticalNew"];
  accountHeat: AnalyticsData["accountHeat"];
  epicClusters: AnalyticsData["epicClusters"];
};

function buildMetricLens(
  data: AnalyticsData,
  metric: MetricInsight | null,
): MetricLensView {
  if (!metric) {
    return {
      label: null,
      rows: data.requestDetails,
      funnel: data.funnel,
      priorityMix: data.priorityMix,
      gapBoard: data.gapBoard,
      themeScores: data.themeScores,
      emergingGaps: data.emergingGaps,
      roadmapThemes: data.roadmapThemes,
      criticalNew: data.criticalNew,
      accountHeat: data.accountHeat,
      epicClusters: data.epicClusters,
    };
  }

  const rows = metric.rows;
  const consolidations = new Set(rows.map((row) => row.consolidation));
  const rowIds = new Set(rows.map((row) => row.id));

  const gapBoard =
    metric.key === "opportunity" || metric.key === "potential"
      ? data.gapBoard
      : metric.key === "coverage"
        ? []
        : data.gapBoard.filter((gap) => consolidations.has(gap.theme));

  const roadmapThemes =
    metric.key === "coverage" || metric.key === "potential"
      ? data.roadmapThemes
      : metric.key === "opportunity" || metric.key === "uncovered"
        ? []
        : data.roadmapThemes.filter((theme) => consolidations.has(theme.theme));

  const themeScores =
    metric.key === "opportunity"
      ? data.themeScores.filter((theme) => !theme.inRoadmap)
      : metric.key === "coverage"
        ? data.themeScores.filter((theme) => theme.inRoadmap)
        : data.themeScores.filter((theme) => consolidations.has(theme.theme));

  const emergingGaps =
    metric.key === "opportunity" || metric.key === "uncovered"
      ? data.emergingGaps
      : data.emergingGaps.filter((gap) => consolidations.has(gap.theme));

  return {
    label: LENS_COPY[metric.key],
    rows,
    funnel: rebuildFunnel(rows),
    priorityMix: rebuildPriorityMix(rows),
    gapBoard,
    themeScores: themeScores.slice(0, 6),
    emergingGaps,
    roadmapThemes,
    criticalNew:
      metric.key === "risk"
        ? data.criticalNew
        : data.criticalNew.filter((row) => rowIds.has(row.id)),
    accountHeat: rebuildAccountHeat(rows),
    epicClusters: (() => {
      const clusters = [
        {
          epic: "Notifications & Digests",
          match: /notif|digest|email|reminder|signature/i,
        },
        {
          epic: "Offboarding & Ownership",
          match: /bulk update|ooo|ownership|deactiv/i,
        },
        {
          epic: "Contract Families / Bundles",
          match: /bundle|link related|relationship|packet|contract/i,
        },
        {
          epic: "Governance & Access",
          match: /access control|permission|scim|tag management|legal user/i,
        },
        { epic: "Express / Campaign UX", match: /express|campaign/i },
        { epic: "Sub-status / Custom Status", match: /status|sub.?status/i },
      ];
      return clusters
        .map((cluster) => {
          const matched = rows.filter((row) =>
            cluster.match.test(row.consolidation),
          );
          if (!matched.length) return null;
          const accountArr = new Map(
            matched.map((row) => [row.account, row.arr] as const),
          );
          const accounts = accountArr.size;
          const unique = [...accountArr.values()].reduce((a, b) => a + b, 0);
          return {
            epic: cluster.epic,
            themes: new Set(matched.map((row) => row.consolidation)).size,
            asks: matched.length,
            accounts,
            uniqueArr: unique,
            prize: accounts * unique,
          };
        })
        .filter(
          (epic): epic is AnalyticsData["epicClusters"][number] => epic != null,
        )
        .sort((a, b) => b.prize - a.prize);
    })(),
  };
}

function buildMetricInsights(data: AnalyticsData): MetricInsight[] {
  const { totals } = data;
  const roadmapNames = new Set(data.roadmapThemes.map((theme) => theme.theme));
  const gapNames = new Set(data.gapBoard.map((gap) => gap.theme));
  const riskIds = new Set(data.criticalNew.map((row) => row.id));
  const voiceRatio =
    totals.requestWeightedArr / Math.max(totals.uniqueBacklogArr, 1);

  const roadmapRows = data.requestDetails.filter((row) =>
    roadmapNames.has(row.consolidation),
  );
  const gapRows = data.requestDetails.filter((row) => gapNames.has(row.consolidation));
  const riskRows = data.requestDetails.filter((row) => riskIds.has(row.id));
  const newRows = data.requestDetails.filter((row) => row.status === "NEW");
  const uncoveredRows = data.requestDetails.filter(
    (row) => !roadmapNames.has(row.consolidation),
  );

  return [
    {
      key: "requests",
      label: "Requests analyzed",
      value: String(totals.requests),
      hint: `${totals.accounts} accounts in backlog`,
      formula: "Count of all Product Request rows in this lens",
      steps: [
        `Total product requests = ${totals.requests}`,
        `Unique customer accounts = ${totals.accounts}`,
        "Each row is one customer ask linked to an account, consolidation, priority, and status.",
      ],
      meaning:
        "This is the raw backlog volume we analyze. Click through to see every ask behind the number.",
      rows: data.requestDetails,
      rowLabel: "All analyzed requests",
    },
    {
      key: "coverage",
      label: "ARR coverage",
      value: pctLabel(totals.arrCoveragePct),
      hint: `${money(totals.roadmapUniqueArr)} of ${money(totals.uniqueBacklogArr)} unique ARR on roadmap`,
      formula: "ARR coverage = (Unique ARR on roadmap ÷ Unique backlog ARR) × 100",
      steps: [
        `Unique backlog ARR = ${money(totals.uniqueBacklogArr)} (each account counted once)`,
        `Unique ARR on roadmap = ${money(totals.roadmapUniqueArr)}`,
        `${money(totals.roadmapUniqueArr)} ÷ ${money(totals.uniqueBacklogArr)} × 100 = ${pctLabel(totals.arrCoveragePct)}`,
      ],
      meaning:
        "How much customer revenue weight is already represented by consolidations that are In Roadmap.",
      rows: roadmapRows,
      rowLabel: "Requests tied to roadmap consolidations",
    },
    {
      key: "opportunity",
      label: "Opportunity prize",
      value: money(totals.opportunityPrize),
      hint: `${data.insights.gapCount} multi-account gaps not on roadmap`,
      formula:
        "Opportunity prize = sum of unique ARR for consolidations with ≥3 accounts that are not In Roadmap",
      steps: [
        "Find consolidations with ≥3 unique accounts and no In Roadmap status.",
        ...data.gapBoard
          .slice(0, 3)
          .map(
            (gap) =>
              `${gap.theme}: ${gap.accounts} accounts · ${money(gap.uniqueArr)} unique ARR`,
          ),
        data.gapBoard.length
          ? `Sum of gap unique ARR = ${money(totals.opportunityPrize)}`
          : "No qualifying gaps yet, so opportunity prize = $0.",
      ],
      meaning:
        "This is the revenue-weighted prize sitting in multi-customer demand that Product has not planned yet.",
      rows: gapRows,
      rowLabel: "Requests inside current opportunity gaps",
    },
    {
      key: "risk",
      label: "Revenue at risk",
      value: money(totals.revenueAtRisk),
      hint: `${totals.critical} critical · ${data.criticalNew.length} still need a decision`,
      warn: true,
      formula:
        "Revenue at risk = unique ARR of Critical requests still in New / Shared / Discussed",
      steps: [
        `Critical requests overall = ${totals.critical}`,
        `Critical still needing a decision = ${data.criticalNew.length}`,
        `Unique ARR of those accounts = ${money(totals.revenueAtRisk)}`,
      ],
      meaning:
        "High-urgency customer revenue that still needs a Product yes/no before it can move to roadmap.",
      rows: riskRows,
      rowLabel: "Critical requests needing attention",
    },
    {
      key: "triage",
      label: "Triage health",
      value: pctLabel(totals.triageHealth),
      hint: `${totals.neu} still New (${pctLabel(totals.neuPct)})`,
      warn: totals.neuPct >= 30,
      formula: "Triage health = 100% − (% of requests still in New)",
      steps: [
        `Requests still New = ${totals.neu}`,
        `New share = ${totals.neu} ÷ ${totals.requests} = ${pctLabel(totals.neuPct)}`,
        `Triage health = 100% − ${pctLabel(totals.neuPct)} = ${pctLabel(totals.triageHealth)}`,
      ],
      meaning:
        "Higher is healthier. Low triage health means too much backlog is still waiting for first review.",
      rows: newRows,
      rowLabel: "Requests still awaiting triage (New)",
    },
    {
      key: "uncovered",
      label: "Uncovered ARR",
      value: money(totals.uncoveredArr),
      hint: "Unique backlog ARR not yet represented on roadmap",
      formula: "Uncovered ARR = Unique backlog ARR − Unique ARR on roadmap",
      steps: [
        `Unique backlog ARR = ${money(totals.uniqueBacklogArr)}`,
        `Unique ARR on roadmap = ${money(totals.roadmapUniqueArr)}`,
        `${money(totals.uniqueBacklogArr)} − ${money(totals.roadmapUniqueArr)} = ${money(totals.uncoveredArr)}`,
      ],
      meaning:
        "Customer revenue weight that is asking for something not yet covered by an In Roadmap consolidation.",
      rows: uncoveredRows,
      rowLabel: "Requests not covered by roadmap consolidations",
    },
    {
      key: "potential",
      label: "Coverage if gaps close",
      value: pctLabel(totals.potentialCoveragePct),
      hint: "Projected coverage after shipping current opportunities",
      formula:
        "Potential coverage = ((Roadmap unique ARR + Opportunity prize) ÷ Unique backlog ARR) × 100",
      steps: [
        `Roadmap unique ARR = ${money(totals.roadmapUniqueArr)}`,
        `Opportunity prize = ${money(totals.opportunityPrize)}`,
        `(${money(totals.roadmapUniqueArr)} + ${money(totals.opportunityPrize)}) ÷ ${money(totals.uniqueBacklogArr)} × 100 = ${pctLabel(totals.potentialCoveragePct)}`,
      ],
      meaning:
        "If Product ships the current multi-account gaps, ARR coverage can rise from today’s level toward this projected %.",
      rows: [...roadmapRows, ...gapRows].filter(
        (row, index, all) => all.findIndex((item) => item.id === row.id) === index,
      ),
      rowLabel: "Requests on roadmap plus current gap opportunities",
    },
    {
      key: "voice",
      label: "Voice vs revenue",
      value: `${voiceRatio.toFixed(1)}x`,
      hint: `${money(totals.requestWeightedArr)} weighted / ${money(totals.uniqueBacklogArr)} unique`,
      formula: "Voice vs revenue = Request-weighted ARR ÷ Unique backlog ARR",
      steps: [
        `Request-weighted ARR = ${money(totals.requestWeightedArr)} (account ARR counted once per request)`,
        `Unique backlog ARR = ${money(totals.uniqueBacklogArr)} (account ARR counted once overall)`,
        `${money(totals.requestWeightedArr)} ÷ ${money(totals.uniqueBacklogArr)} = ${voiceRatio.toFixed(2)}x`,
      ],
      meaning:
        "Above 1.0x means some accounts asked multiple times. Use unique ARR for decisions; weighted ARR only shows voice volume.",
      rows: data.requestDetails,
      rowLabel: "All requests used in weighted vs unique ARR",
    },
  ];
}

export function AnalyticsDashboard({ data }: Readonly<{ data: AnalyticsData }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lens = searchParams.get("lens") || "global";
  const csOwner = searchParams.get("csOwner") || "";
  const [detailFilter, setDetailFilter] = useState<DetailFilter | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [showMetricRows, setShowMetricRows] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const metrics = buildMetricInsights(data);
  const activeMetric = metrics.find((metric) => metric.key === selectedMetric) ?? null;
  const view = buildMetricLens(data, activeMetric);
  const topPrize = data.insights.topPrize;

  function setLens(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lens", next);
    if (next !== "csm") params.delete("csOwner");
    router.push(`/analytics?${params.toString()}`);
  }

  function setOwner(owner: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lens", "csm");
    if (owner) params.set("csOwner", owner);
    else params.delete("csOwner");
    router.push(`/analytics?${params.toString()}`);
  }

  const maxFunnel = Math.max(...view.funnel.map((f) => f.count), 1);
  const maxPrize = Math.max(...view.themeScores.map((t) => t.prize), 1);
  const visiblePriorities = view.priorityMix.filter((priority) => priority.count > 0);

  const visibleDetails = detailFilter
    ? view.rows.filter((request) => {
        if (detailFilter.kind === "all") return true;
        if (detailFilter.kind === "consolidation") {
          return request.consolidation === detailFilter.value;
        }
        return request[detailFilter.kind] === detailFilter.value;
      })
    : [];

  function showDetails(
    kind: DetailFilter["kind"],
    label: string,
    value?: string,
  ) {
    setDetailFilter({ kind, label, value });
  }

  function openMetric(key: MetricKey) {
    setDetailFilter(null);
    setShowMetricRows(false);
    setSelectedMetric((current) => (current === key ? null : key));
  }

  useEffect(() => {
    if (!detailFilter) return;
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [detailFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          lens === "global" ? "Organization analytics" : `${lens.toUpperCase()} analytics`
        }
        title="Product request intelligence"
        description="Click a KPI to open its formula under the cards and filter the charts below to that lens. Click again to clear."
        actions={
          <div className="flex flex-wrap gap-2">
            {(["global", "csm", "pm"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLens(l)}
                className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm capitalize transition ${
                  lens === l
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {l === "global" ? "Organization" : l.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      {topPrize ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-eyebrow">
                This week&apos;s top prize recommendation
              </p>
              <h2 className="mt-1 font-display text-2xl">
                {topPrize.theme}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Feature: {topPrize.feature} · {topPrize.formula} · Prize{" "}
                {money(topPrize.prize)} ·{" "}
                {topPrize.inRoadmap ? "Already covered on roadmap" : "Still a gap / opportunity"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                showDetails(
                  "consolidation",
                  `${topPrize.theme} · top prize detail`,
                  topPrize.theme,
                )
              }
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Inspect requests
            </button>
          </div>
        </section>
      ) : null}

      {lens === "csm" ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--ink-muted)]">CS Owner</label>
          <select
            className="control w-auto"
            value={csOwner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">All CSMs</option>
            {data.csOwners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(0, 4).map((metric) => (
          <Stat
            key={metric.key}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            warn={metric.warn}
            active={selectedMetric === metric.key}
            onClick={() => openMetric(metric.key)}
            interactiveLabel
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(4).map((metric) => (
          <Stat
            key={metric.key}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            warn={metric.warn}
            active={selectedMetric === metric.key}
            onClick={() => openMetric(metric.key)}
            interactiveLabel
          />
        ))}
      </div>

      {activeMetric ? (
        <InlineFormulaStrip
          metric={activeMetric}
          lensLabel={view.label}
          showRows={showMetricRows}
          onToggleRows={() => setShowMetricRows((current) => !current)}
          onClose={() => {
            setSelectedMetric(null);
            setShowMetricRows(false);
          }}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--ink-muted)]">
          Tip: select a KPI to filter the page and reveal its formula here — no
          jump to the bottom.
        </p>
      )}

      {view.label ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm">
          <p>
            <span className="font-medium text-[var(--accent)]">Active filter · </span>
            {view.label}
            <span className="text-[var(--ink-muted)]">
              {" "}
              · {view.rows.length} request{view.rows.length === 1 ? "" : "s"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedMetric(null);
              setShowMetricRows(false);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface)]/60"
          >
            Clear lens
          </button>
        </div>
      ) : null}

      <Card title="How this page analyzes demand">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.insights.analysis.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--ink-muted)]">
          <span className="font-medium text-[var(--ink)]">Prize formula:</span>{" "}
          # of unique accounts × unique ARR. Higher prize = more customers and more
          revenue weight behind the same consolidation.
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={view.label ? "Where requests stand (filtered)" : "Where requests stand"}
          action={
            <DetailMenu
              label="status"
              onShowAll={() =>
                showDetails(
                  "all",
                  view.label ? `Requests in ${activeMetric?.label}` : "All product requests",
                )
              }
            />
          }
        >
          <div className="space-y-3">
            {view.funnel.length ? (
              view.funnel.map((f) => (
                <button
                  key={f.status}
                  type="button"
                  onClick={() =>
                    showDetails("status", `${readableLabel(f.status)} requests`, f.status)
                  }
                  className="block w-full rounded-lg p-1 text-left transition hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span>{readableLabel(f.status)}</span>
                    <span className="font-medium">
                      {f.count} · {money(f.uniqueArr)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-2)]">
                    <div
                      className={`h-2 rounded-full ${statusChartColors[f.status] ?? "bg-[var(--chart-neutral)]"}`}
                      style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No status rows match this KPI lens.
              </p>
            )}
          </div>
        </Card>

        <Card
          title={view.label ? "Priority at a glance (filtered)" : "Priority at a glance"}
          action={
            <DetailMenu
              label="priority"
              onShowAll={() =>
                showDetails(
                  "all",
                  view.label ? `Requests in ${activeMetric?.label}` : "All product requests",
                )
              }
            />
          }
        >
          <div className="grid grid-cols-2 gap-3">
            {visiblePriorities.length ? (
              visiblePriorities.map((p) => (
                <button
                  key={p.priority}
                  type="button"
                  onClick={() =>
                    showDetails(
                      "priority",
                      `${readableLabel(p.priority)} priority requests`,
                      p.priority,
                    )
                  }
                  className="rounded-xl bg-[var(--surface-2)] p-4 text-left transition hover:ring-2 hover:ring-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        priorityChartColors[p.priority] ?? "bg-[var(--chart-neutral)]"
                      }`}
                    />
                    {readableLabel(p.priority)}
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{p.count}</p>
                </button>
              ))
            ) : (
              <p className="col-span-2 text-sm text-[var(--ink-muted)]">
                No priority rows match this KPI lens.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div ref={detailRef}>
        {detailFilter ? (
          <RequestDetailsTable
            title={detailFilter.label}
            rows={visibleDetails}
            onClose={() => setDetailFilter(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              showDetails(
                "all",
                view.label
                  ? `Requests in ${activeMetric?.label}`
                  : "All product requests",
              )
            }
            className="w-full rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            View the {view.label ? "filtered" : "complete"} request table
          </button>
        )}
      </div>

      {lens !== "csm" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={view.label ? "Top roadmap opportunities (filtered)" : "Top roadmap opportunities (gaps)"}>
              <p className="mb-3 text-sm text-[var(--ink-muted)]">
                ≥3 accounts, not In Roadmap. Click a row for account/ask detail.
              </p>
              {view.gapBoard.length ? (
                <div className="space-y-2">
                  {view.gapBoard.slice(0, 5).map((gap) => (
                    <button
                      key={gap.theme}
                      type="button"
                      onClick={() =>
                        showDetails(
                          "consolidation",
                          `${gap.theme} · opportunity detail`,
                          gap.theme,
                        )
                      }
                      className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{gap.theme}</p>
                          <p className="text-xs text-[var(--ink-muted)]">
                            Feature: {gap.feature} · {gap.formula}
                          </p>
                        </div>
                        <Badge>Prize {money(gap.prize)}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--ink-muted)]">
                        <span>{gap.accounts} accounts</span>
                        <span>{money(gap.uniqueArr)} unique ARR</span>
                        <span>{gap.critical} critical</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">
                  No multi-account gaps match this KPI lens.
                </p>
              )}
            </Card>

            <Card title={view.label ? "Prize leaderboard (filtered)" : "Prize leaderboard"}>
              <p className="mb-3 text-sm text-[var(--ink-muted)]">
                Highest customer demand by prize score (accounts × unique ARR).
              </p>
              <div className="space-y-3">
                {view.themeScores.length ? (
                  view.themeScores.slice(0, 6).map((theme) => (
                    <button
                      key={theme.theme}
                      type="button"
                      onClick={() =>
                        showDetails(
                          "consolidation",
                          `${theme.theme} · demand detail`,
                          theme.theme,
                        )
                      }
                      className="block w-full rounded-lg p-1 text-left transition hover:bg-[var(--surface-2)]"
                    >
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="font-medium">{theme.theme}</span>
                        <span>
                          {money(theme.prize)} ·{" "}
                          {theme.inRoadmap ? "Covered" : "Gap"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-2)]">
                        <div
                          className={`h-2 rounded-full ${
                            theme.inRoadmap ? "bg-[var(--chart-shipped)]" : "bg-[var(--accent)]"
                          }`}
                          style={{ width: `${(theme.prize / maxPrize) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {theme.accounts} accounts · {money(theme.uniqueArr)} ARR ·{" "}
                        {theme.feature}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">
                    No consolidations match this KPI lens.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Revenue coverage story">
              <div className="space-y-4">
                <CoverageBar
                  label="On roadmap now"
                  value={data.totals.roadmapUniqueArr}
                  total={data.totals.uniqueBacklogArr}
                  color="bg-[var(--chart-shipped)]"
                />
                <CoverageBar
                  label="Opportunity if gaps ship"
                  value={data.totals.opportunityPrize}
                  total={data.totals.uniqueBacklogArr}
                  color="bg-[var(--accent)]"
                />
                <CoverageBar
                  label="Still uncovered"
                  value={Math.max(
                    data.totals.uncoveredArr - data.totals.opportunityPrize,
                    0,
                  )}
                  total={data.totals.uniqueBacklogArr}
                  color="bg-[var(--chart-medium)]"
                />
                <p className="text-sm text-[var(--ink-muted)]">
                  Closing all current gaps can move ARR coverage from{" "}
                  <span className="font-medium text-[var(--ink)]">
                    {pctLabel(data.totals.arrCoveragePct)}
                  </span>{" "}
                  toward{" "}
                  <span className="font-medium text-[var(--ink)]">
                    {pctLabel(data.totals.potentialCoveragePct)}
                  </span>
                  .
                </p>
              </div>
            </Card>

            <Card title={view.label ? "Epic clusters (filtered)" : "Epic clusters by prize"}>
              {view.epicClusters.length ? (
                <SimpleTable
                  headers={["Epic", "Asks", "Accounts", "Unique ARR", "Prize"]}
                  rows={view.epicClusters.map((epic) => [
                    epic.epic,
                    String(epic.asks),
                    String(epic.accounts),
                    money(epic.uniqueArr),
                    money(epic.prize),
                  ])}
                />
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">
                  No epic clusters match this KPI lens.
                </p>
              )}
            </Card>
          </div>

          {view.emergingGaps.length ? (
            <Card title="Emerging opportunities (2 accounts)">
              <p className="mb-3 text-sm text-[var(--ink-muted)]">
                Not gaps yet, but worth watching — one more account would make these
                roadmap opportunities.
              </p>
              <SimpleTable
                headers={["Consolidation", "Feature", "Accounts", "Unique ARR", "Prize"]}
                rows={view.emergingGaps.map((gap) => [
                  gap.theme,
                  gap.feature,
                  String(gap.accounts),
                  money(gap.uniqueArr),
                  money(gap.prize),
                ])}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={view.label ? "Needs attention (filtered)" : "Needs attention now"}>
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            Critical requests still waiting for a Product decision (New / Shared /
            Discussed).
          </p>
          <QueueList rows={view.criticalNew} />
        </Card>

        <Card title={view.label ? "Account heat (filtered)" : "Account heat (asks × ARR)"}>
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            Accounts with the strongest combination of volume and revenue weight.
          </p>
          <SimpleTable
            headers={["Account", "ARR", "Asks", "Critical", "Heat"]}
            rows={view.accountHeat.map((account) => [
              account.name,
              money(account.arr),
              String(account.asks),
              String(account.critical),
              money(account.heat),
            ])}
          />
        </Card>
      </div>

      {lens === "csm" ? (
        <Card title="CSM workload">
          <SimpleTable
            headers={["Owner", "Asks", "New", "Critical", "Accounts"]}
            rows={data.csmLoad.map((c) => [
              c.owner,
              String(c.asks),
              String(c.neu),
              String(c.critical),
              String(c.accounts),
            ])}
          />
        </Card>
      ) : null}

      {lens !== "csm" && view.roadmapThemes.length ? (
        <Card title={view.label ? "On roadmap (filtered)" : "Already on roadmap (unique ARR)"}>
          <SimpleTable
            headers={["Consolidation", "Feature", "Accounts", "Unique ARR", "Prize"]}
            rows={view.roadmapThemes.map((theme) => [
              theme.theme,
              theme.feature,
              String(theme.accounts),
              money(theme.uniqueArr),
              money(theme.prize),
            ])}
          />
        </Card>
      ) : null}
    </div>
  );
}

function InlineFormulaStrip({
  metric,
  lensLabel,
  showRows,
  onToggleRows,
  onClose,
}: {
  metric: MetricInsight;
  lensLabel: string | null;
  showRows: boolean;
  onToggleRows: () => void;
  onClose: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--accent)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <p className="text-eyebrow">
            Formula · under KPIs
          </p>
          <h2 className="mt-1 font-display text-2xl">
            {metric.label}: {metric.value}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{metric.meaning}</p>
          {lensLabel ? (
            <p className="mt-2 text-xs font-medium text-[var(--accent)]">{lensLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleRows}
            className="rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent)]"
          >
            {showRows ? "Hide rows" : `See ${metric.rows.length} rows`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-2)] p-4">
          <p className="text-sm font-semibold">Formula</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{metric.formula}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {metric.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
          <p className="text-sm font-semibold">Behind this number</p>
          <p className="mt-2 font-display text-3xl font-semibold">{metric.rows.length}</p>
          <p className="text-sm text-[var(--ink-muted)]">{metric.rowLabel}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Charts below are filtered to this lens. Clear the KPI to return to the
            full org view.
          </p>
        </div>
      </div>

      {showRows ? (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <RequestDetailsTable
            title={metric.label}
            rows={metric.rows}
            onClose={onToggleRows}
            embedded
          />
        </div>
      ) : null}
    </section>
  );
}

function CoverageBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const width = total ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {money(value)} · {pctLabel(width)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--surface-2)]">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function DetailMenu({
  label,
  onShowAll,
}: {
  label: string;
  onShowAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open ${label} chart menu`}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-48 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onShowAll();
              setOpen(false);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
          >
            Show detailed table
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RequestDetailsTable({
  title,
  rows,
  onClose,
  embedded = false,
}: {
  title: string;
  rows: RequestDetail[];
  onClose: () => void;
  embedded?: boolean;
}) {
  const table = rows.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface-2)] text-label">
            {[
              "Account",
              "Ask",
              "Consolidation",
              "Feature",
              "ARR",
              "Priority",
              "Status",
              "CS owner",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((request) => (
            <tr
              key={request.id}
              className="border-t border-[var(--border)] align-top hover:bg-[var(--surface-2)]"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium">
                {request.account}
              </td>
              <td className="max-w-[280px] px-4 py-3">
                <Link
                  href={`/product-requests/${request.id}`}
                  className="line-clamp-2 text-[var(--accent)] hover:underline"
                >
                  {request.ask}
                </Link>
              </td>
              <td className="max-w-[220px] px-4 py-3">{request.consolidation}</td>
              <td className="max-w-[220px] px-4 py-3">{request.feature}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium">
                {money(request.arr)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge>{readableLabel(request.priority)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {readableLabel(request.status)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{request.csOwner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="px-1 py-4 text-sm text-[var(--ink-muted)]">
      No requests match this selection.
    </p>
  );

  if (embedded) {
    return (
      <div>
        <p className="sr-only">{title}</p>
        {table}
      </div>
    );
  }

  return (
    <section className="scroll-mt-4 rounded-[var(--radius-xl)] border border-[var(--accent)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="font-display text-xl">{title}</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            {rows.length} request{rows.length === 1 ? "" : "s"} behind this view
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
        >
          Hide table
        </button>
      </div>
      {table}
    </section>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">No rows for this lens.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--ink-muted)]">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueueList({
  rows,
}: {
  rows: {
    id: string;
    account: string;
    arr: number | null;
    theme: string;
    csOwner: string | null;
    status?: string;
    ask?: string;
  }[];
}) {
  if (!rows.length) {
    return <p className="text-sm text-[var(--ink-muted)]">Queue is clear.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.slice(0, 12).map((r) => (
        <li key={r.id}>
          <Link
            href={`/product-requests/${r.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]"
          >
            <span className="min-w-0">
              <span className="font-medium">{r.account}</span>
              <span className="text-[var(--ink-muted)]"> · {r.theme}</span>
              {r.ask ? (
                <span className="mt-0.5 block truncate text-xs text-[var(--ink-muted)]">
                  {r.ask}
                </span>
              ) : null}
            </span>
            <span className="flex flex-shrink-0 items-center gap-2 text-xs text-[var(--ink-muted)]">
              {r.status ? <Badge>{readableLabel(r.status)}</Badge> : null}
              {r.arr != null ? money(r.arr) : "—"}
              {r.csOwner ? <Badge>{r.csOwner}</Badge> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
