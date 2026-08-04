import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { money, readableLabel } from "@/lib/format";
import type { WorkspaceRetentionDetail as Detail } from "@/lib/services/retention";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function renewalTone(band: string) {
  if (band === "HIGH") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (band === "MEDIUM") {
    return "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
}

function activityTone(status: string) {
  if (status === "STOPPED" || status === "SHARPLY_REDUCED") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (status === "REDUCED") return "bg-[var(--warning-soft)] text-[var(--warning)]";
  if (status === "INCREASED") return "bg-[var(--success-soft)] text-[var(--success)]";
  return "bg-[var(--surface-2)] text-[var(--ink-muted)]";
}

export function WorkspaceRetentionDetail({ data }: Readonly<{ data: Detail }>) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace detail"
        title={data.org.name}
        description={
          <>
            WS slug <span className="font-mono">{data.org.slug}</span> · Owner{" "}
            {data.org.csOwner} · {money(data.org.arr)} ARR
          </>
        }
        actions={
          <div
            className={`rounded-[var(--radius-xl)] border px-4 py-3 ${renewalTone(data.renewal.band)}`}
          >
            <p className="text-label opacity-80">Renewal outlook</p>
            <p className="font-display text-xl font-semibold">
              {data.renewal.label} · {data.renewal.score}/100
            </p>
          </div>
        }
      />

      <section className={`rounded-[var(--radius-xl)] border px-5 py-4 ${renewalTone(data.renewal.band)}`}>
        <p className="font-medium">{data.renewal.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Badge>
            Contract end: {formatDate(data.org.contractEndDate)}
            {data.org.daysToExpiry != null ? ` (${data.org.daysToExpiry}d)` : ""}
          </Badge>
          <Badge>
            Last activity: {formatDate(data.org.lastActivityAt)}
            {data.org.daysSinceActivity != null
              ? ` · quiet ${data.org.daysSinceActivity}d`
              : " · never recorded"}
          </Badge>
          {data.org.isDark ? (
            <Badge className="bg-[var(--danger-soft)] text-[var(--danger)]">Dark account</Badge>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-xl">
            Activity that stopped or reduced
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Comparing last {data.activity.periodDays} days vs the previous{" "}
            {data.activity.periodDays} days.
          </p>
          <div className="mt-4 space-y-2">
            {[...data.activity.stopped, ...data.activity.reduced].length ? (
              [...data.activity.stopped, ...data.activity.reduced].map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {row.priorCount} → {row.currentCount} (
                      {row.changePct > 0 ? "+" : ""}
                      {Math.round(row.changePct)}%)
                    </p>
                  </div>
                  <Badge className={activityTone(row.status)}>
                    {readableLabel(row.status)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No major activity drops in this window.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-xl">
            What they are expecting
          </h2>
          <div className="mt-4 space-y-2">
            {data.expectations.length ? (
              data.expectations.map((item) => (
                <div
                  key={`${item.kind}-${item.title}`}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{item.kind}</Badge>
                    <Badge>{readableLabel(item.priority)}</Badge>
                  </div>
                  <p className="mt-2 font-medium">{item.title}</p>
                  <p className="mt-1 text-[var(--ink-muted)]">{item.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">No open expectations captured.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-xl">
          Full workspace activity
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--ink-muted)]">
                {["Activity", "Prior 30d", "Current 30d", "Change", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.activity.rows.map((row) => (
                <tr key={row.key} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3 font-medium">{row.label}</td>
                  <td className="px-3 py-3">{row.priorCount}</td>
                  <td className="px-3 py-3">{row.currentCount}</td>
                  <td className="px-3 py-3">
                    {row.changePct > 0 ? "+" : ""}
                    {Math.round(row.changePct)}%
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={activityTone(row.status)}>
                      {readableLabel(row.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-xl">
          Features they are asking for
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--ink-muted)]">
                {[
                  "Ask",
                  "Consolidation",
                  "Feature",
                  "Priority",
                  "Status",
                  "Expectation",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.featureAsks.length ? (
                data.featureAsks.map((ask) => (
                  <tr key={ask.id} className="border-b border-[var(--border)] last:border-0 align-top">
                    <td className="max-w-[280px] px-3 py-3">
                      <Link
                        href={`/product-requests/${ask.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {ask.ask}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{ask.consolidation}</td>
                    <td className="px-3 py-3">{ask.feature}</td>
                    <td className="px-3 py-3">
                      <Badge>{readableLabel(ask.priority)}</Badge>
                    </td>
                    <td className="px-3 py-3">{readableLabel(ask.status)}</td>
                    <td className="max-w-[240px] px-3 py-3 text-[var(--ink-muted)]">
                      {ask.expectation}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-[var(--ink-muted)]">
                    No product requests linked to this workspace yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
