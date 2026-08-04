"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FeatureRequestSourceType,
  FeatureRequestStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RequestStatusBadge, SignalStatusBadge } from "@/components/hub/status-badge";
import { FeatureRequestActivitySection } from "@/components/hub/feature-request-activity-section";
import type { ActivityItem } from "@/components/hub/feature-request-activity-section";

type Source = {
  id: string;
  type: FeatureRequestSourceType;
  label: string;
  url: string;
  externalId: string | null;
};

type Activity = ActivityItem;

type Detail = {
  id: string;
  title: string;
  summary: string;
  status: FeatureRequestStatus;
  dueDate: string | null;
  tags: { tag: { id: string; name: string } }[];
  votes: { id: string; userId: string; user: { name: string | null; email: string } }[];
  notes: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string | null; email: string } | null;
  }[];
  signals: {
    id: string;
    status: "PENDING" | "MATCHED" | "DISMISSED";
    rawText: string;
    triageNote: string | null;
    permalink: string | null;
    createdAt: string;
    org: { id: string; name: string };
    channel: { name: string };
  }[];
  sources: Source[];
  activities: Activity[];
  workspaces: { id: string; name: string }[];
  roadmap: { id: string; title: string; quarter: string | null } | null;
  currentUserId: string;
  roadmapOptions: { id: string; title: string; quarter: string | null }[];
};

const statuses = Object.values(FeatureRequestStatus);
const sourceTypes = Object.values(FeatureRequestSourceType);

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function RequestDetailClient({ detail }: { detail: Detail }) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [roadmapId, setRoadmapId] = useState(detail.roadmap?.id ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(detail.dueDate));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<FeatureRequestSourceType>("SLACK");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const voted = detail.votes.some((v) => v.userId === detail.currentUserId);

  const orgs = detail.workspaces.length
    ? detail.workspaces
    : [...new Map(detail.signals.map((s) => [s.org.id, s.org])).values()];

  async function saveMeta() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        roadmapId: roadmapId || null,
        dueDate: dueDate || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
    }
    setBusy(false);
    router.refresh();
  }

  async function toggleVote() {
    setBusy(true);
    await fetch(`/api/requests/${detail.id}/votes`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    await fetch(`/api/requests/${detail.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    setBusy(false);
    router.refresh();
  }

  async function addSource() {
    if (!sourceLabel.trim() || !sourceUrl.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${detail.id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: sourceType,
        label: sourceLabel,
        url: sourceUrl,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add source");
    } else {
      setSourceLabel("");
      setSourceUrl("");
    }
    setBusy(false);
    router.refresh();
  }

  async function removeSource(sourceId: string) {
    setBusy(true);
    await fetch(`/api/requests/${detail.id}/sources/${sourceId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">{detail.title}</h1>
            <p className="mt-2 max-w-3xl text-[var(--ink-muted)]">{detail.summary}</p>
          </div>
          <RequestStatusBadge status={detail.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{detail.votes.length} votes</Badge>
          <Badge>{orgs.length} workspaces</Badge>
          {detail.dueDate ? (
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
              Due {toDateInputValue(detail.dueDate)}
            </Badge>
          ) : null}
          {detail.tags.map((t) => (
            <Badge key={t.tag.id} className="bg-[var(--accent-soft)] text-[var(--accent)]">
              {t.tag.name}
            </Badge>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeatureRequestStatus)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="roadmap">Roadmap item</Label>
            <select
              id="roadmap"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={roadmapId}
              onChange={(e) => setRoadmapId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {detail.roadmapOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.quarter ? `${r.quarter} — ` : ""}
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={saveMeta} disabled={busy}>
              Save
            </Button>
            <Button variant="secondary" onClick={toggleVote} disabled={busy}>
              {voted ? "Remove vote" : "Vote"}
            </Button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Sources</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Slack channels or Jira tickets linked to this feature (manual links for now).
        </p>
        <div className="mt-4 space-y-2">
          {detail.sources.map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge>{source.type}</Badge>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-[var(--accent)] underline"
                >
                  {source.label}
                </a>
              </div>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => removeSource(source.id)}
                className="text-[var(--danger)]"
              >
                Remove
              </Button>
            </div>
          ))}
          {detail.sources.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No sources yet.</p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label htmlFor="sourceType">Type</Label>
            <select
              id="sourceType"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as FeatureRequestSourceType)}
            >
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sourceLabel">Label</Label>
            <Input
              id="sourceLabel"
              placeholder="#product or PROJ-123"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="sourceUrl">URL</Label>
            <Input
              id="sourceUrl"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            disabled={busy || !sourceLabel.trim() || !sourceUrl.trim()}
            onClick={addSource}
          >
            Add source
          </Button>
        </div>
      </section>

      <FeatureRequestActivitySection
        featureRequestId={detail.id}
        activities={detail.activities}
        sources={detail.sources}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Requested by workspaces
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {orgs.map((org) => (
              <Badge key={org.id} className="bg-[var(--accent-soft)] text-[var(--accent)]">
                {org.name}
              </Badge>
            ))}
            {orgs.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No workspaces linked yet.</p>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {detail.signals.map((signal) => (
              <div key={signal.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {signal.org.name} · #{signal.channel.name}
                  </div>
                  <SignalStatusBadge status={signal.status} />
                </div>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{signal.rawText}</p>
                {signal.triageNote ? (
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">Note: {signal.triageNote}</p>
                ) : null}
                {signal.permalink ? (
                  <a
                    href={signal.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--accent)] underline"
                  >
                    Slack permalink
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Notes</h2>
          <div className="mt-4 space-y-3">
            {detail.notes.map((n) => (
              <div key={n.id} className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
                <p>{n.body}</p>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {n.author?.name || n.author?.email || "Unknown"} ·{" "}
                  <span suppressHydrationWarning>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="note">Add note</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="button" onClick={addNote} disabled={busy || !note.trim()}>
              Add note
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
