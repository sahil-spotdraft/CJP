"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Stat } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { money } from "@/lib/format";
import type { RetentionDashboard as RetentionData } from "@/lib/services/retention";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function RetentionDashboard({ data }: Readonly<{ data: RetentionData }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const csOwner = searchParams.get("csOwner") || "";
  const darkDays = searchParams.get("darkDays") || String(data.darkThresholdDays);
  const [selectedId, setSelectedId] = useState<string | null>(data.atRisk[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nudgePreview, setNudgePreview] = useState<{
    subject: string;
    body: string;
  } | null>(null);

  const selected = useMemo(
    () => data.accounts.find((account) => account.id === selectedId) ?? null,
    [data.accounts, selectedId],
  );

  function updateParams(next: { csOwner?: string; darkDays?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.csOwner !== undefined) {
      if (next.csOwner) params.set("csOwner", next.csOwner);
      else params.delete("csOwner");
    }
    if (next.darkDays !== undefined) {
      params.set("darkDays", next.darkDays);
    }
    router.push(`/retention?${params.toString()}`);
  }

  async function sendAlert(orgId: string) {
    setBusy(`alert:${orgId}`);
    setToast(null);
    try {
      const res = await fetch("/api/retention/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Alert failed");
      setToast(
        json.delivered
          ? "Slack alert sent to the account channel."
          : "Alert logged locally (Slack not configured or channel missing).",
      );
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Alert failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendNudge(orgId: string, templateId: string) {
    setBusy(`nudge:${orgId}:${templateId}`);
    setToast(null);
    try {
      const res = await fetch("/api/retention/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, templateId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nudge failed");
      setNudgePreview({ subject: json.subject, body: json.body });
      setToast("Nudge prepared and logged. Copy/send from the preview.");
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Nudge failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CS retention"
        title="Renewal & silent-churn radar"
        description="Surfaces contracts nearing expiry (30/60/90) and accounts that have gone dark — then lets CSMs alert Slack and trigger one-click outreach nudges."
        actions={
          <>
            <label className="text-sm text-[var(--ink-muted)]">
              CS Owner
              <select
                className="control ml-2 w-auto"
                value={csOwner}
                onChange={(e) => updateParams({ csOwner: e.target.value })}
              >
                <option value="">All owners</option>
                {data.csOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[var(--ink-muted)]">
              Dark after
              <select
                className="control ml-2 w-auto"
                value={darkDays}
                onChange={(e) => updateParams({ darkDays: e.target.value })}
              >
                {[14, 30, 45, 60].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      <section className="rounded-[var(--radius-xl)] border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-5 py-4 text-sm text-[var(--warning)]">
        <p className="font-semibold">{data.story.title}</p>
        <p className="mt-1">{data.story.body}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="At-risk ARR"
          value={money(data.totals.atRiskArr)}
          hint={`${data.totals.atRisk} accounts flagged`}
          warn
        />
        <Stat
          label="Expiry ≤30 days"
          value={String(data.totals.expiry30)}
          hint={`${money(data.totals.expiry30Arr)} ARR`}
          warn
        />
        <Stat
          label="Expiry ≤60 / ≤90"
          value={`${data.totals.expiry60} / ${data.totals.expiry90}`}
          hint={`${money(data.totals.expiry60Arr + data.totals.expiry90Arr)} ARR in mid windows`}
        />
        <Stat
          label="Dark accounts"
          value={String(data.totals.dark)}
          hint={`${money(data.totals.darkArr)} ARR · no activity ≥${data.darkThresholdDays}d`}
          warn
        />
      </div>

      {toast ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <Card title="Renewal pipeline">
            <div className="grid gap-4 md:grid-cols-3">
              <ExpiryBucket
                label="30 days"
                rows={data.expiryPipeline.d30}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <ExpiryBucket
                label="60 days"
                rows={data.expiryPipeline.d60}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <ExpiryBucket
                label="90 days"
                rows={data.expiryPipeline.d90}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </Card>

          <Card title="Dark accounts (zero activity)">
            {data.darkAccounts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--ink-muted)]">
                      {["Account", "ARR", "Owner", "Last activity", "Days quiet", ""].map(
                        (heading) => (
                          <th key={heading || "actions"} className="px-3 py-2 font-medium">
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.darkAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className={`border-b border-[var(--border)] last:border-0 ${
                          selectedId === account.id ? "bg-[var(--accent-soft)]" : ""
                        }`}
                      >
                        <td className="px-3 py-3 font-medium">{account.name}</td>
                        <td className="px-3 py-3">{money(account.arr)}</td>
                        <td className="px-3 py-3">{account.csOwner}</td>
                        <td className="px-3 py-3">{formatDate(account.lastActivityAt)}</td>
                        <td className="px-3 py-3">
                          {account.daysSinceActivity ?? "Never"}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/retention/${account.id}`}
                            className="text-[var(--accent)] hover:underline"
                          >
                            Open WS
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No dark accounts at the current threshold.
              </p>
            )}
          </Card>

          <Card title="All accounts / workspaces">
            <p className="mb-3 text-sm text-[var(--ink-muted)]">
              Open any workspace to inspect activity drops, feature asks, expectations,
              and renewal likelihood.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--ink-muted)]">
                    {[
                      "Account / WS",
                      "ARR",
                      "Owner",
                      "Expiry",
                      "Quiet days",
                      "Stopped / reduced",
                      "Renewal chance",
                      "",
                    ].map((heading) => (
                      <th key={heading || "open"} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{account.slug}</p>
                      </td>
                      <td className="px-3 py-3">{money(account.arr)}</td>
                      <td className="px-3 py-3">{account.csOwner}</td>
                      <td className="px-3 py-3">
                        {account.daysToExpiry == null
                          ? "—"
                          : account.daysToExpiry < 0
                            ? "Expired"
                            : `${account.daysToExpiry}d`}
                      </td>
                      <td className="px-3 py-3">
                        {account.daysSinceActivity ?? "Never"}
                      </td>
                      <td className="px-3 py-3">
                        {account.stoppedCount}/{account.decliningCount}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          className={
                            account.renewalBand === "HIGH"
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : account.renewalBand === "MEDIUM"
                                ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                                : "bg-[var(--danger-soft)] text-[var(--danger)]"
                          }
                        >
                          {account.renewalBand === "HIGH"
                            ? "High"
                            : account.renewalBand === "MEDIUM"
                              ? "Medium"
                              : "Low"}{" "}
                          · {account.renewalScore}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/retention/${account.id}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          Open WS
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card title="Account action panel">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{selected.name}</h3>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {money(selected.arr)} ARR · Owner {selected.csOwner}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.expiryWindow ? (
                    <Badge className="bg-[var(--warning-soft)] text-[var(--warning)]">
                      Expiry {selected.expiryWindow}d
                    </Badge>
                  ) : null}
                  {selected.isDark ? (
                    <Badge className="bg-[var(--danger-soft)] text-[var(--danger)]">Dark account</Badge>
                  ) : null}
                  {!selected.risks.length ? (
                    <Badge>Healthy right now</Badge>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-sm">
                  <Row label="Contract end" value={formatDate(selected.contractEndDate)} />
                  <Row
                    label="Days to expiry"
                    value={
                      selected.daysToExpiry == null
                        ? "—"
                        : selected.daysToExpiry < 0
                          ? `Expired ${Math.abs(selected.daysToExpiry)}d ago`
                          : `${selected.daysToExpiry}d`
                    }
                  />
                  <Row label="Last activity" value={formatDate(selected.lastActivityAt)} />
                  <Row
                    label="Days quiet"
                    value={
                      selected.daysSinceActivity == null
                        ? "No activity recorded"
                        : `${selected.daysSinceActivity}d`
                    }
                  />
                  <Row
                    label="Slack channel"
                    value={selected.slackChannelName || "Not linked"}
                  />
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/retention/${selected.id}`}
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                  >
                    Open workspace detail
                  </Link>
                  <Button
                    disabled={!selected.risks.length || busy === `alert:${selected.id}`}
                    onClick={() => sendAlert(selected.id)}
                  >
                    {busy === `alert:${selected.id}` ? "Sending…" : "Send Slack alert"}
                  </Button>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">One-click nudge templates</p>
                  <div className="space-y-2">
                    {data.nudgeTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        disabled={busy?.startsWith(`nudge:${selected.id}`)}
                        onClick={() => sendNudge(selected.id, template.id)}
                        className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)] disabled:opacity-60"
                      >
                        <span className="font-medium">{template.label}</span>
                        <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                          via {template.channel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {nudgePreview ? (
                  <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
                    <p className="font-medium">{nudgePreview.subject}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[var(--ink-muted)]">
                      {nudgePreview.body}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                Select an account from the pipeline or dark list.
              </p>
            )}
          </Card>

          <Card title="Recent alerts & nudges">
            {data.recentAlerts.length ? (
              <ul className="space-y-3">
                {data.recentAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{alert.orgName}</span>
                      <Badge>{alert.kind}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[var(--ink-muted)]">{alert.message}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">No alerts sent yet.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ExpiryBucket({
  label,
  rows,
  selectedId,
  onSelect,
}: {
  label: string;
  rows: RetentionData["expiryPipeline"]["d30"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <Badge>{rows.length}</Badge>
      </div>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm transition ${
                  selectedId === row.id
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "hover:bg-[var(--surface)]"
                }`}
              >
                <span className="font-medium">{row.name}</span>
                <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                  {money(row.arr)} · {row.daysToExpiry}d · {row.csOwner}
                </span>
                <Link
                  href={`/retention/${row.id}`}
                  className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open WS
                </Link>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">None in this window.</p>
      )}
    </div>
  );
}
