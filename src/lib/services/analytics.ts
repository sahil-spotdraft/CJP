import { ClmPriority, ClmRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const include = {
  org: true,
  consolidation: true,
  csOwner: true,
} satisfies Prisma.ProductRequestInclude;

export type AnalyticsLens = "global" | "csm" | "pm";

function uniqueArr(orgs: { id: string; arr: number | null }[]) {
  const seen = new Map<string, number>();
  for (const org of orgs) {
    if (!seen.has(org.id)) seen.set(org.id, org.arr ?? 0);
  }
  return [...seen.values()].reduce((a, b) => a + b, 0);
}

function pct(part: number, whole: number) {
  return whole ? (part / whole) * 100 : 0;
}

function csOwnerName(owner: { name: string } | null | undefined) {
  return owner?.name ?? null;
}

export async function getAnalytics(lens: AnalyticsLens = "global", csOwner?: string) {
  const where: Prisma.ProductRequestWhereInput =
    lens === "csm" && csOwner ? { csOwner: { name: csOwner } } : {};

  const requests = await prisma.productRequest.findMany({
    where,
    include,
  });

  const byStatus = new Map<
    string,
    { count: number; weightedArr: number; orgs: Map<string, number> }
  >();
  const byPriority = new Map<string, number>();
  const statusPriority: Record<string, Record<string, number>> = {};
  const themeMap = new Map<
    string,
    {
      name: string;
      feature: string;
      accounts: Map<string, number>;
      asks: number;
      critical: number;
      statuses: Set<string>;
      inRoadmap: boolean;
    }
  >();
  const accountMap = new Map<
    string,
    { name: string; arr: number; asks: number; critical: number; neu: number }
  >();
  const csmMap = new Map<
    string,
    { owner: string; asks: number; critical: number; neu: number; uniqueOrgs: Set<string> }
  >();

  let requestWeightedArr = 0;
  let criticalWeightedArr = 0;

  for (const r of requests) {
    const status = r.status;
    const priority = r.priority ?? "NOT_SET";
    const arr = r.org.arr ?? 0;
    requestWeightedArr += arr;
    if (priority === "CRITICAL") criticalWeightedArr += arr;

    const statusBucket = byStatus.get(status) ?? {
      count: 0,
      weightedArr: 0,
      orgs: new Map(),
    };
    statusBucket.count += 1;
    statusBucket.weightedArr += arr;
    statusBucket.orgs.set(r.org.id, arr);
    byStatus.set(status, statusBucket);

    byPriority.set(priority, (byPriority.get(priority) ?? 0) + 1);
    statusPriority[status] ??= {};
    statusPriority[status][priority] =
      (statusPriority[status][priority] ?? 0) + 1;

    const themeName = r.consolidation?.name ?? "(Unconsolidated)";
    const theme = themeMap.get(themeName) ?? {
      name: themeName,
      feature: r.consolidation?.feature ?? "Not specified",
      accounts: new Map(),
      asks: 0,
      critical: 0,
      statuses: new Set(),
      inRoadmap: false,
    };
    theme.accounts.set(r.org.id, arr);
    theme.asks += 1;
    theme.statuses.add(status);
    if (status === ClmRequestStatus.IN_ROADMAP) theme.inRoadmap = true;
    if (r.priority === ClmPriority.CRITICAL) theme.critical += 1;
    if (!theme.feature || theme.feature === "Not specified") {
      theme.feature = r.consolidation?.feature ?? theme.feature;
    }
    themeMap.set(themeName, theme);

    const account = accountMap.get(r.org.id) ?? {
      name: r.org.name,
      arr,
      asks: 0,
      critical: 0,
      neu: 0,
    };
    account.asks += 1;
    if (r.priority === ClmPriority.CRITICAL) account.critical += 1;
    if (status === ClmRequestStatus.NEW) account.neu += 1;
    accountMap.set(r.org.id, account);

    const owner = csOwnerName(r.csOwner) || "Unassigned";
    const csm = csmMap.get(owner) ?? {
      owner,
      asks: 0,
      critical: 0,
      neu: 0,
      uniqueOrgs: new Set(),
    };
    csm.asks += 1;
    if (r.priority === ClmPriority.CRITICAL) csm.critical += 1;
    if (r.status === ClmRequestStatus.NEW) csm.neu += 1;
    csm.uniqueOrgs.add(r.org.id);
    csmMap.set(owner, csm);
  }

  const uniqueBacklogArr = [...accountMap.values()].reduce((s, a) => s + a.arr, 0);

  const roadmapThemes = [...themeMap.values()]
    .filter((t) => t.inRoadmap)
    .map((t) => {
      const unique = uniqueArr(
        [...t.accounts.entries()].map(([id, arr]) => ({ id, arr })),
      );
      return {
        theme: t.name,
        feature: t.feature,
        accounts: t.accounts.size,
        asks: t.asks,
        uniqueArr: unique,
        prize: t.accounts.size * unique,
      };
    })
    .sort((a, b) => b.uniqueArr - a.uniqueArr);

  const roadmapUniqueArr = (() => {
    const orgs = new Map<string, number>();
    for (const t of themeMap.values()) {
      if (!t.inRoadmap) continue;
      for (const [id, arr] of t.accounts) orgs.set(id, arr);
    }
    return [...orgs.values()].reduce((a, b) => a + b, 0);
  })();

  const themeScores = [...themeMap.values()]
    .map((t) => {
      const unique = uniqueArr(
        [...t.accounts.entries()].map(([id, arr]) => ({ id, arr })),
      );
      const prize = t.accounts.size * unique;
      return {
        theme: t.name,
        feature: t.feature,
        accounts: t.accounts.size,
        asks: t.asks,
        uniqueArr: unique,
        prize,
        score: prize,
        inRoadmap: t.inRoadmap,
        critical: t.critical,
        formula: `${t.accounts.size} accounts × ${unique}`,
      };
    })
    .sort((a, b) => b.prize - a.prize || b.accounts - a.accounts);

  const gapBoard = themeScores
    .filter((t) => !t.inRoadmap && t.accounts >= 3)
    .map((t) => ({
      theme: t.theme,
      feature: t.feature,
      accounts: t.accounts,
      asks: t.asks,
      uniqueArr: t.uniqueArr,
      prize: t.prize,
      critical: t.critical,
      statuses: [...(themeMap.get(t.theme)?.statuses ?? [])],
      formula: t.formula,
    }));

  const emergingGaps = themeScores
    .filter((t) => !t.inRoadmap && t.accounts === 2)
    .slice(0, 5)
    .map((t) => ({
      theme: t.theme,
      feature: t.feature,
      accounts: t.accounts,
      uniqueArr: t.uniqueArr,
      prize: t.prize,
      critical: t.critical,
    }));

  const attentionStatuses: ClmRequestStatus[] = [
    ClmRequestStatus.NEW,
    ClmRequestStatus.SHARED_WITH_PRODUCT,
    ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
  ];

  const criticalAttention = requests
    .filter(
      (r) =>
        r.priority === ClmPriority.CRITICAL &&
        attentionStatuses.includes(r.status),
    )
    .map((r) => ({
      id: r.id,
      account: r.org.name,
      arr: r.org.arr,
      theme: r.consolidation?.name ?? "—",
      csOwner: csOwnerName(r.csOwner),
      status: r.status,
      ask: r.ask,
    }))
    .sort((a, b) => (b.arr ?? 0) - (a.arr ?? 0));

  const criticalDiscussed = requests
    .filter(
      (r) =>
        r.priority === ClmPriority.CRITICAL &&
        r.status === ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
    )
    .map((r) => ({
      id: r.id,
      account: r.org.name,
      arr: r.org.arr,
      theme: r.consolidation?.name ?? "—",
      csOwner: csOwnerName(r.csOwner),
    }))
    .sort((a, b) => (b.arr ?? 0) - (a.arr ?? 0));

  const revenueAtRisk = uniqueArr(
    criticalAttention.map((r) => ({
      id: r.account,
      arr: r.arr,
    })),
  );

  // Prefer org id based risk when possible
  const revenueAtRiskUnique = (() => {
    const orgs = new Map<string, number>();
    for (const r of requests) {
      if (
        r.priority === ClmPriority.CRITICAL &&
        attentionStatuses.includes(r.status)
      ) {
        orgs.set(r.org.id, r.org.arr ?? 0);
      }
    }
    return [...orgs.values()].reduce((a, b) => a + b, 0);
  })();

  const opportunityPrize = gapBoard.reduce((sum, g) => sum + g.uniqueArr, 0);
  const topPrize = themeScores[0] ?? null;
  const neuCount = byStatus.get(ClmRequestStatus.NEW)?.count ?? 0;
  const criticalCount = byPriority.get("CRITICAL") ?? 0;
  const arrCoveragePct = pct(roadmapUniqueArr, uniqueBacklogArr);
  const triageHealth = Math.max(0, Math.round(100 - pct(neuCount, requests.length)));
  const uncoveredArr = Math.max(uniqueBacklogArr - roadmapUniqueArr, 0);
  const potentialCoveragePct = pct(
    roadmapUniqueArr + opportunityPrize,
    uniqueBacklogArr,
  );

  const accountHeat = [...accountMap.values()]
    .map((a) => ({
      name: a.name,
      arr: a.arr,
      asks: a.asks,
      critical: a.critical,
      neu: a.neu,
      heat: a.asks * a.arr,
    }))
    .sort((a, b) => b.heat - a.heat || b.arr - a.arr)
    .slice(0, 20);

  const csmLoad = [...csmMap.values()]
    .map((c) => ({
      owner: c.owner,
      asks: c.asks,
      critical: c.critical,
      neu: c.neu,
      accounts: c.uniqueOrgs.size,
    }))
    .sort((a, b) => b.asks - a.asks);

  const statusOrder: ClmRequestStatus[] = [
    ClmRequestStatus.NEW,
    ClmRequestStatus.SHARED_WITH_PRODUCT,
    ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
    ClmRequestStatus.IN_ROADMAP,
    ClmRequestStatus.CLOSED,
    ClmRequestStatus.PLANNED,
    ClmRequestStatus.IN_PROGRESS,
    ClmRequestStatus.SHIPPED,
    ClmRequestStatus.DECLINED,
  ];

  const funnel = statusOrder.flatMap((status) => {
    const bucket = byStatus.get(status);
    if (!bucket) return [];
    return [
      {
        status,
        count: bucket.count,
        weightedArr: bucket.weightedArr,
        uniqueArr: [...bucket.orgs.values()].reduce((a, b) => a + b, 0),
        pct: pct(bucket.count, requests.length),
      },
    ];
  });

  const priorityMix = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NOT_SET"].map((p) => ({
    priority: p,
    count: byPriority.get(p) ?? 0,
  }));

  const epicClusters = [
    { epic: "Notifications & Digests", match: /notif|digest|email|reminder|signature/i },
    { epic: "Offboarding & Ownership", match: /bulk update|ooo|ownership|deactiv/i },
    { epic: "Contract Families / Bundles", match: /bundle|link related|relationship|packet|contract/i },
    { epic: "Governance & Access", match: /access control|permission|scim|tag management|legal user/i },
    { epic: "Express / Campaign UX", match: /express|campaign/i },
    { epic: "Sub-status / Custom Status", match: /status|sub.?status/i },
  ]
    .map((cluster) => {
      const themes = [...themeMap.values()].filter((t) => cluster.match.test(t.name));
      const matched = requests.filter((r) =>
        cluster.match.test(r.consolidation?.name ?? ""),
      );
      const accounts = new Set(matched.map((r) => r.org.id)).size;
      const unique = uniqueArr(
        matched.map((r) => ({ id: r.org.id, arr: r.org.arr })),
      );
      return {
        epic: cluster.epic,
        themes: themes.length,
        asks: matched.length,
        accounts,
        uniqueArr: unique,
        prize: accounts * unique,
      };
    })
    .filter((e) => e.asks > 0)
    .sort((a, b) => b.prize - a.prize);

  const requestDetails = requests
    .map((request) => ({
      id: request.id,
      account: request.org.name,
      ask: request.ask,
      consolidation: request.consolidation?.name ?? "Unconsolidated",
      feature: request.consolidation?.feature ?? "Not specified",
      arr: request.org.arr ?? 0,
      priority: request.priority ?? "NOT_SET",
      status: request.status,
      csOwner: csOwnerName(request.csOwner) ?? "Unassigned",
    }))
    .sort((a, b) => b.arr - a.arr);

  const analysis = [
    {
      title: "What we analyze",
      body: `We analyze ${requests.length} product requests across ${accountMap.size} accounts using unique ARR (each account counted once), consolidation demand, priority, and pipeline status.`,
    },
    {
      title: "What the prize means",
      body: topPrize
        ? `Prize score = #accounts × unique ARR. Top prize today is “${topPrize.theme}” at ${topPrize.accounts} × $${Math.round(topPrize.uniqueArr).toLocaleString()} = ${Math.round(topPrize.prize).toLocaleString()}.`
        : "Prize score = #accounts × unique ARR. It ranks consolidations by customer reach and revenue weight.",
    },
    {
      title: "Revenue coverage vs opportunity",
      body: `${Math.round(arrCoveragePct)}% of unique backlog ARR is already represented on the roadmap ($${Math.round(roadmapUniqueArr).toLocaleString()} of $${Math.round(uniqueBacklogArr).toLocaleString()}). Closing current gaps could lift coverage toward ${Math.round(potentialCoveragePct)}%.`,
    },
    {
      title: "Revenue at risk",
      body: `Critical requests still awaiting a Product decision represent $${Math.round(revenueAtRiskUnique).toLocaleString()} unique ARR across ${criticalAttention.length} asks.`,
    },
  ];

  return {
    lens,
    csOwner: csOwner ?? null,
    totals: {
      requests: requests.length,
      accounts: accountMap.size,
      uniqueBacklogArr,
      requestWeightedArr,
      roadmapUniqueArr,
      uncoveredArr,
      opportunityPrize,
      revenueAtRisk: revenueAtRiskUnique || revenueAtRisk,
      criticalWeightedArr,
      critical: criticalCount,
      neu: neuCount,
      neuPct: pct(neuCount, requests.length),
      arrCoveragePct,
      potentialCoveragePct,
      triageHealth,
    },
    insights: {
      topPrize,
      gapCount: gapBoard.length,
      emergingCount: emergingGaps.length,
      analysis,
    },
    funnel,
    priorityMix,
    statusPriority,
    roadmapThemes,
    gapBoard,
    emergingGaps,
    themeScores: themeScores.slice(0, 15),
    criticalNew: criticalAttention,
    criticalDiscussed,
    accountHeat,
    csmLoad,
    epicClusters,
    requestDetails,
    csOwners: [...csmMap.keys()].sort(),
  };
}
