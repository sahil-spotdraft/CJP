import { ClmPriority, ClmRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const include = {
  org: true,
  consolidation: true,
} satisfies Prisma.ProductRequestInclude;

export type AnalyticsLens = "global" | "csm" | "pm";

function uniqueArr(orgs: { id: string; arr: number | null }[]) {
  const seen = new Map<string, number>();
  for (const org of orgs) {
    if (!seen.has(org.id)) seen.set(org.id, org.arr ?? 0);
  }
  return [...seen.values()].reduce((a, b) => a + b, 0);
}

export async function getAnalytics(lens: AnalyticsLens = "global", csOwner?: string) {
  const where: Prisma.ProductRequestWhereInput =
    lens === "csm" && csOwner ? { csOwner } : {};

  const requests = await prisma.productRequest.findMany({
    where,
    include,
  });

  const byStatus = new Map<
    string,
    { count: number; weightedArr: number; orgs: Map<string, number> }
  >();
  const byPriority = new Map<string, number>();
  const themeMap = new Map<
    string,
    {
      name: string;
      accounts: Map<string, number>;
      critical: number;
      statuses: Set<string>;
      inRoadmap: boolean;
    }
  >();
  const accountMap = new Map<
    string,
    { name: string; arr: number; asks: number; critical: number }
  >();
  const csmMap = new Map<
    string,
    { owner: string; asks: number; critical: number; neu: number; uniqueOrgs: Set<string> }
  >();

  let requestWeightedArr = 0;

  for (const r of requests) {
    const status = r.status;
    const priority = r.priority ?? "NOT_SET";
    const arr = r.org.arr ?? 0;
    requestWeightedArr += arr;

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

    const themeName = r.consolidation?.name ?? "(Unconsolidated)";
    const theme = themeMap.get(themeName) ?? {
      name: themeName,
      accounts: new Map(),
      critical: 0,
      statuses: new Set(),
      inRoadmap: false,
    };
    theme.accounts.set(r.org.id, arr);
    theme.statuses.add(status);
    if (status === ClmRequestStatus.IN_ROADMAP) theme.inRoadmap = true;
    if (r.priority === ClmPriority.CRITICAL) theme.critical += 1;
    themeMap.set(themeName, theme);

    const account = accountMap.get(r.org.id) ?? {
      name: r.org.name,
      arr,
      asks: 0,
      critical: 0,
    };
    account.asks += 1;
    if (r.priority === ClmPriority.CRITICAL) account.critical += 1;
    accountMap.set(r.org.id, account);

    const owner = r.csOwner || "Unassigned";
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
    .map((t) => ({
      theme: t.name,
      accounts: t.accounts.size,
      uniqueArr: uniqueArr(
        [...t.accounts.entries()].map(([id, arr]) => ({ id, arr })),
      ),
    }))
    .sort((a, b) => b.uniqueArr - a.uniqueArr);

  const roadmapUniqueArr = (() => {
    const orgs = new Map<string, number>();
    for (const t of themeMap.values()) {
      if (!t.inRoadmap) continue;
      for (const [id, arr] of t.accounts) orgs.set(id, arr);
    }
    return [...orgs.values()].reduce((a, b) => a + b, 0);
  })();

  const gapBoard = [...themeMap.values()]
    .filter((t) => !t.inRoadmap && t.accounts.size >= 3)
    .map((t) => {
      const unique = uniqueArr(
        [...t.accounts.entries()].map(([id, arr]) => ({ id, arr })),
      );
      return {
        theme: t.name,
        accounts: t.accounts.size,
        uniqueArr: unique,
        critical: t.critical,
        statuses: [...t.statuses],
      };
    })
    .sort((a, b) => b.accounts - a.accounts || b.uniqueArr - a.uniqueArr);

  const themeScores = [...themeMap.values()]
    .map((t) => {
      const unique = uniqueArr(
        [...t.accounts.entries()].map(([id, arr]) => ({ id, arr })),
      );
      return {
        theme: t.name,
        accounts: t.accounts.size,
        uniqueArr: unique,
        score: t.accounts.size * unique,
        inRoadmap: t.inRoadmap,
        critical: t.critical,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const criticalNew = requests
    .filter(
      (r) =>
        r.priority === ClmPriority.CRITICAL && r.status === ClmRequestStatus.NEW,
    )
    .map((r) => ({
      id: r.id,
      account: r.org.name,
      arr: r.org.arr,
      theme: r.consolidation?.name ?? "—",
      csOwner: r.csOwner,
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
      csOwner: r.csOwner,
    }))
    .sort((a, b) => (b.arr ?? 0) - (a.arr ?? 0));

  const accountHeat = [...accountMap.values()]
    .map((a) => ({
      name: a.name,
      arr: a.arr,
      asks: a.asks,
      critical: a.critical,
    }))
    .sort((a, b) => b.asks - a.asks || b.arr - a.arr)
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
    ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
    ClmRequestStatus.IN_ROADMAP,
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
        pct: requests.length ? (bucket.count / requests.length) * 100 : 0,
      },
    ];
  });

  const priorityMix = ["CRITICAL", "HIGH", "LOW", "NOT_SET"].map((p) => ({
    priority: p,
    count: byPriority.get(p) ?? 0,
  }));

  const epicClusters = [
    { epic: "Notifications & Digests", match: /notif|digest|email|reminder/i },
    { epic: "Offboarding & Ownership", match: /bulk update|ooo|ownership|deactiv/i },
    { epic: "Contract Families / Bundles", match: /bundle|link related|relationship|packet/i },
    { epic: "Governance & Access", match: /access control|permission|scim|tag management/i },
    { epic: "Express / Campaign UX", match: /express|campaign/i },
    { epic: "Sub-status / Custom Status", match: /status|sub.?status/i },
  ].map((cluster) => {
    const themes = [...themeMap.values()].filter((t) => cluster.match.test(t.name));
    const matched = requests.filter((r) =>
      cluster.match.test(r.consolidation?.name ?? ""),
    );
    return {
      epic: cluster.epic,
      themes: themes.length,
      asks: matched.length,
      accounts: new Set(matched.map((r) => r.org.id)).size,
      uniqueArr: uniqueArr(
        matched.map((r) => ({ id: r.org.id, arr: r.org.arr })),
      ),
    };
  });

  return {
    lens,
    csOwner: csOwner ?? null,
    totals: {
      requests: requests.length,
      accounts: accountMap.size,
      uniqueBacklogArr,
      requestWeightedArr,
      roadmapUniqueArr,
      critical: byPriority.get("CRITICAL") ?? 0,
      neu: byStatus.get(ClmRequestStatus.NEW)?.count ?? 0,
      neuPct: requests.length
        ? ((byStatus.get(ClmRequestStatus.NEW)?.count ?? 0) / requests.length) * 100
        : 0,
    },
    funnel,
    priorityMix,
    roadmapThemes,
    gapBoard,
    themeScores,
    criticalNew,
    criticalDiscussed,
    accountHeat,
    csmLoad,
    epicClusters,
    csOwners: [...csmMap.keys()].sort(),
  };
}
