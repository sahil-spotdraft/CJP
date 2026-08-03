"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type AnalyticsData = {
  lens: string;
  csOwner: string | null;
  totals: {
    requests: number;
    accounts: number;
    uniqueBacklogArr: number;
    requestWeightedArr: number;
    roadmapUniqueArr: number;
    critical: number;
    neu: number;
    neuPct: number;
  };
  funnel: { status: string; count: number; uniqueArr: number; pct: number }[];
  priorityMix: { priority: string; count: number }[];
  gapBoard: {
    theme: string;
    accounts: number;
    uniqueArr: number;
    critical: number;
    statuses: string[];
  }[];
  themeScores: {
    theme: string;
    accounts: number;
    uniqueArr: number;
    score: number;
    inRoadmap: boolean;
    critical: number;
  }[];
  roadmapThemes: { theme: string; accounts: number; uniqueArr: number }[];
  criticalNew: {
    id: string;
    account: string;
    arr: number | null;
    theme: string;
    csOwner: string | null;
  }[];
  criticalDiscussed: {
    id: string;
    account: string;
    arr: number | null;
    theme: string;
    csOwner: string | null;
  }[];
  accountHeat: {
    name: string;
    arr: number;
    asks: number;
    critical: number;
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
  }[];
  csOwners: string[];
};

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

export function AnalyticsDashboard({ data }: Readonly<{ data: AnalyticsData }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lens = searchParams.get("lens") || "global";
  const csOwner = searchParams.get("csOwner") || "";

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

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Request analytics
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--ink-muted)]">
            Org-wide view for CS, Product, and Eng. Prioritize with{" "}
            <span className="font-medium text-[var(--ink)]">unique account ARR</span>;
            request-weighted ARR is voice volume only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["global", "csm", "pm"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                lens === l
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "bg-[var(--surface)] text-[var(--ink-muted)] ring-1 ring-[var(--border)]"
              }`}
            >
              {l === "global" ? "Organization" : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {lens === "csm" ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--ink-muted)]">CS Owner</label>
          <select
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open requests" value={String(data.totals.requests)} />
        <Stat
          label="Still New"
          value={`${Math.round(data.totals.neuPct)}%`}
          hint={`${data.totals.neu} untriaged`}
          warn
        />
        <Stat label="Critical" value={String(data.totals.critical)} warn />
        <Stat
          label="Unique ARR In Roadmap"
          value={money(data.totals.roadmapUniqueArr)}
          hint={`vs ${money(data.totals.uniqueBacklogArr)} backlog`}
        />
      </div>

      {lens !== "csm" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Use unique ARR for roadmap decisions — request-weighted ARR (
          {money(data.totals.requestWeightedArr)}) double-counts multi-ask accounts.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Funnel by status">
          <div className="space-y-2">
            {data.funnel.map((f) => (
              <div key={f.status}>
                <div className="mb-1 flex justify-between text-xs text-[var(--ink-muted)]">
                  <span>{f.status.replaceAll("_", " ")}</span>
                  <span>
                    {f.count} · {money(f.uniqueArr)} unique
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent)]"
                    style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Priority mix">
          <div className="flex flex-wrap gap-3">
            {data.priorityMix.map((p) => (
              <div
                key={p.priority}
                className="min-w-[100px] flex-1 rounded-xl bg-[var(--surface-2)] p-3 text-center"
              >
                <p className="text-2xl font-semibold">{p.count}</p>
                <p className="text-xs uppercase text-[var(--ink-muted)]">
                  {p.priority.replaceAll("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {lens !== "csm" ? (
        <>
          <Card title="Cross-customer theme score (# accounts × unique ARR)">
            <SimpleTable
              headers={["Theme", "Accounts", "Unique ARR", "Score", "Roadmap"]}
              rows={data.themeScores.slice(0, 12).map((t) => [
                t.theme,
                String(t.accounts),
                money(t.uniqueArr),
                money(t.score),
                t.inRoadmap ? "In Roadmap" : "Gap",
              ])}
            />
          </Card>

          <Card title="Roadmap gap board (≥3 accounts, not In Roadmap)">
            <SimpleTable
              headers={["Theme", "Accounts", "Unique ARR", "Critical"]}
              rows={data.gapBoard.slice(0, 12).map((t) => [
                t.theme,
                String(t.accounts),
                money(t.uniqueArr),
                String(t.critical),
              ])}
            />
          </Card>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Critical + New (needs Product intake)">
          <QueueList rows={data.criticalNew} />
        </Card>
        <Card title="Critical + Discussed (needs yes/no)">
          <QueueList rows={data.criticalDiscussed} />
        </Card>
      </div>

      {lens === "pm" || lens === "global" ? (
        <Card title="In Roadmap themes (unique ARR)">
          <SimpleTable
            headers={["Theme", "Accounts", "Unique ARR"]}
            rows={data.roadmapThemes.map((t) => [
              t.theme,
              String(t.accounts),
              money(t.uniqueArr),
            ])}
          />
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account heat">
          <SimpleTable
            headers={["Account", "ARR", "Asks", "Critical"]}
            rows={data.accountHeat.slice(0, 12).map((a) => [
              a.name,
              money(a.arr),
              String(a.asks),
              String(a.critical),
            ])}
          />
        </Card>
        <Card title="CSM owner load">
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
      </div>

      {lens !== "csm" ? (
        <Card title="Epic clusters">
          <SimpleTable
            headers={["Epic", "Asks", "Accounts", "Unique ARR"]}
            rows={data.epicClusters.map((e) => [
              e.epic,
              String(e.asks),
              String(e.accounts),
              money(e.uniqueArr),
            ])}
          />
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${warn ? "text-amber-800" : ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
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
            <span>
              <span className="font-medium">{r.account}</span>
              <span className="text-[var(--ink-muted)]"> · {r.theme}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
              {r.arr != null ? money(r.arr) : "—"}
              {r.csOwner ? <Badge>{r.csOwner}</Badge> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
