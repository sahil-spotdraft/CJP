"use client";

import { useEffect, useState } from "react";
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

function levelRowClass(level: ActivityLevel) {
  switch (level) {
    case "SUCCESS":
      return "border border-l-[3px] border-emerald-200/80 border-l-emerald-500 bg-emerald-50/60";
    case "WARNING":
      return "border border-l-[3px] border-amber-200 border-l-amber-500 bg-amber-50/70";
    case "CRITICAL":
      return "border border-l-[3px] border-red-200 border-l-red-500 bg-red-50/70";
    default:
      return "border border-[var(--border)] bg-[var(--surface-2)]/70";
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

function levelMessageClass(level: ActivityLevel) {
  switch (level) {
    case "SUCCESS":
      return "border-emerald-200/80";
    case "WARNING":
      return "border-amber-200";
    case "CRITICAL":
      return "border-red-200";
    default:
      return "border-[var(--border)]";
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

function formatOccurredAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function errorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Failed to add activity";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err;
  return "Failed to add activity";
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

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="font-display text-2xl">Activity</h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Message-style updates from Slack, Jira, or the team. Level marks concern so you can scan feature health.
      </p>

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {activities.map((item) => {
          const authorLabel = item.author?.name || item.author?.email || "System";
          const level = item.level ?? "INFO";
          return (
            <article
              key={item.id}
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
            >
              <div className="flex items-start gap-3">
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
                    <time
                      dateTime={item.occurredAt}
                      className="text-xs font-medium text-[var(--ink-muted)]"
                      suppressHydrationWarning
                    >
                      {formatOccurredAt(item.occurredAt)}
                    </time>
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
                  disabled={busy}
                  onClick={() => removeActivity(item.id)}
                  className="shrink-0 text-[var(--danger)]"
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
        {activities.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No activity messages yet.</p>
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
                if (e.key === "Enter" && title.trim() && !busy) {
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
            disabled={busy || !title.trim()}
            onClick={() => void addActivity()}
          >
            {busy ? "Posting…" : "Post message"}
          </Button>
        </div>
      </div>
    </section>
  );
}
