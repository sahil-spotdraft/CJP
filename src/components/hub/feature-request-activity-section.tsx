"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

type FeatureRequestSourceType = "SLACK" | "JIRA";
type FeatureRequestActivityKind = "NOTE" | "SLACK" | "JIRA" | "STATUS" | "SYSTEM";
type ActivityLevel = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type ActivitySource = {
  id: string;
  type: FeatureRequestSourceType;
  label: string;
  url: string;
  externalId: string | null;
};

export type ActivityItem = {
  id: string;
  kind: FeatureRequestActivityKind;
  level: ActivityLevel;
  title: string;
  body: string | null;
  occurredAt: string;
  sourceId: string | null;
  source: ActivitySource | null;
  author: { name: string | null; email: string } | null;
};

const activityKinds: FeatureRequestActivityKind[] = [
  "NOTE",
  "SLACK",
  "JIRA",
  "STATUS",
  "SYSTEM",
];

const activityLevels: ActivityLevel[] = ["INFO", "SUCCESS", "WARNING", "CRITICAL"];

function levelLabel(level: ActivityLevel) {
  switch (level) {
    case "SUCCESS":
      return "Healthy";
    case "WARNING":
      return "Concern";
    case "CRITICAL":
      return "Critical";
    default:
      return "Info";
  }
}

function levelBadgeClass(level: ActivityLevel) {
  switch (level) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "WARNING":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "CRITICAL":
      return "border-red-300 bg-red-100 text-red-900";
    default:
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)]";
  }
}

function levelAvatarClass(level: ActivityLevel) {
  switch (level) {
    case "SUCCESS":
      return "bg-emerald-100 text-emerald-800";
    case "WARNING":
      return "bg-amber-100 text-amber-900";
    case "CRITICAL":
      return "bg-red-100 text-red-800";
    default:
      return "bg-[var(--accent-soft)] text-[var(--accent)]";
  }
}

function toDateTimeLocalValue(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local wall time to ISO so the server timezone does not shift it. */
function dateTimeLocalToIso(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function formatTimelineDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Failed to add activity";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err;
  return "Failed to add activity";
}

function PullSkeleton({ status }: Readonly<{ status: string }>) {
  return (
    <article
      aria-live="polite"
      className="rounded-[var(--radius-xl)] border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)]/30 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--accent-soft)]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            <p className="text-sm font-medium text-[var(--accent)]">{status}</p>
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-[var(--border)]" />
          <div className="mt-2 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-full animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeatureRequestActivitySection({
  featureRequestId,
  activities,
  sources,
}: {
  featureRequestId: string;
  activities: ActivityItem[];
  sources: ActivitySource[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<FeatureRequestActivityKind>("NOTE");
  const [level, setLevel] = useState<ActivityLevel>("INFO");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  // Empty on SSR to avoid hydration mismatch (server TZ ≠ browser TZ).
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    setOccurredAt(toDateTimeLocalValue());
  }, []);

  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      ),
    [activities],
  );

  const hasSources = sources.length > 0;
  const primarySource = sources[0] ?? null;
  const locked = busy || pulling;

  async function addActivity() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const isoOccurredAt = occurredAt ? dateTimeLocalToIso(occurredAt) : undefined;
      const res = await fetch(`/api/requests/${featureRequestId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          level,
          title: title.trim(),
          body: body.trim() || undefined,
          sourceId: sourceId || null,
          occurredAt: isoOccurredAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data));
        return;
      }
      setTitle("");
      setBody("");
      setSourceId("");
      setLevel("INFO");
      setOccurredAt(toDateTimeLocalValue());
      router.refresh();
    } catch {
      setError("Failed to add activity");
    } finally {
      setBusy(false);
    }
  }

  async function removeActivity(activityId: string) {
    setBusy(true);
    try {
      await fetch(`/api/requests/${featureRequestId}/activities/${activityId}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pullFromSource() {
    if (!primarySource) return;
    setPulling(true);
    setError(null);

    const sourceLabel = primarySource.label;
    const sourceType = primarySource.type;
    const steps =
      sourceType === "JIRA"
        ? [
            `Connecting to Jira · ${sourceLabel}…`,
            `Fetching issue comments from ${sourceLabel}…`,
            `Reading timeline events…`,
            `Importing update into this request…`,
          ]
        : [
            `Connecting to Slack · ${sourceLabel}…`,
            `Fetching recent messages from ${sourceLabel}…`,
            `Scanning thread history…`,
            `Importing update into this request…`,
          ];

    try {
      for (let i = 0; i < steps.length - 1; i += 1) {
        setPullStatus(steps[i]!);
        await sleep(650 + Math.floor(Math.random() * 450));
      }
      setPullStatus(steps[steps.length - 1]!);

      const res = await fetch(`/api/requests/${featureRequestId}/activities/pull`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data) || "Failed to pull from source");
        return;
      }

      setPullStatus(`Loaded update from ${sourceLabel}`);
      await sleep(350);
      router.refresh();
    } catch {
      setError("Failed to pull from source");
    } finally {
      setPulling(false);
      setPullStatus("");
    }
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Activity</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Updates pulled from linked sources, with exact dates so you can follow the timeline.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={locked || !hasSources}
          onClick={() => void pullFromSource()}
          title={
            hasSources
              ? primarySource
                ? `Fetch latest updates from ${primarySource.type}: ${primarySource.label}`
                : "Pull from linked source"
              : "Add a linked source first"
          }
        >
          {pulling ? "Fetching…" : "Pull from source"}
        </Button>
      </div>

      {hasSources ? (
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Sources:{" "}
          {sources.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? " · " : null}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] underline"
              >
                {s.type}: {s.label}
              </a>
            </span>
          ))}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {pulling ? <PullSkeleton status={pullStatus || "Fetching from source…"} /> : null}

        {sortedActivities.map((item) => {
          const authorLabel = item.author?.name || item.author?.email || "System";
          const level = item.level ?? "INFO";
          const timeline = formatTimelineDate(item.occurredAt);
          return (
            <article
              key={item.id}
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex w-[5.5rem] shrink-0 flex-col items-start pt-0.5">
                  <time
                    dateTime={item.occurredAt}
                    className="text-[11px] font-semibold leading-tight text-[var(--ink)]"
                    suppressHydrationWarning
                  >
                    {timeline.date}
                  </time>
                  <time
                    dateTime={item.occurredAt}
                    className="mt-0.5 text-[11px] font-medium text-[var(--ink-muted)]"
                    suppressHydrationWarning
                  >
                    {timeline.time}
                  </time>
                </div>
                <div
                  aria-hidden
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${levelAvatarClass(level)}`}
                >
                  {authorLabel.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-[var(--ink)]">{authorLabel}</span>
                    <Badge>{item.kind}</Badge>
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${levelBadgeClass(level)}`}
                    >
                      {levelLabel(level)}
                    </span>
                    {item.source ? (
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--accent)] underline"
                      >
                        {item.source.label}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-sm">
                    <p className="text-sm font-medium text-[var(--ink)]">{item.title}</p>
                    {item.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-muted)]">
                        {item.body}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => removeActivity(item.id)}
                  className="shrink-0 text-[var(--danger)]"
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
        {!pulling && sortedActivities.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No activity yet. Pull from a linked source to load the timeline.
          </p>
        ) : null}
      </div>

      <div className="mt-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
        <p className="mb-3 text-sm font-medium text-[var(--ink)]">Post a message</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="activityKind">Kind</Label>
            <select
              id="activityKind"
              className="control"
              value={kind}
              onChange={(e) => setKind(e.target.value as FeatureRequestActivityKind)}
            >
              {activityKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="activityLevel">Concern</Label>
            <select
              id="activityLevel"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value as ActivityLevel)}
            >
              {activityLevels.map((l) => (
                <option key={l} value={l}>
                  {levelLabel(l)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="activityOccurredAt">Occurred at</Label>
            <Input
              id="activityOccurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="activitySource">Linked source (optional)</Label>
            <select
              id="activitySource"
              className="control"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">None</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.type}: {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="activityTitle">Message</Label>
            <Input
              id="activityTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What happened?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim() && !locked) {
                  e.preventDefault();
                  void addActivity();
                }
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="activityBody">Details (optional)</Label>
            <Textarea
              id="activityBody"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste Slack/Jira context or add more detail…"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={locked || !title.trim()}
            onClick={() => void addActivity()}
          >
            {busy ? "Posting…" : "Post message"}
          </Button>
        </div>
      </div>
    </section>
  );
}
