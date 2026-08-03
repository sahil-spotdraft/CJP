"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeatureRequestStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Textarea } from "@/components/ui/input";
import { RequestStatusBadge, SignalStatusBadge } from "@/components/hub/status-badge";

type Detail = {
  id: string;
  title: string;
  summary: string;
  status: FeatureRequestStatus;
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
  roadmap: { id: string; title: string; quarter: string | null } | null;
  currentUserId: string;
  roadmapOptions: { id: string; title: string; quarter: string | null }[];
};

const statuses = Object.values(FeatureRequestStatus);

export function RequestDetailClient({ detail }: { detail: Detail }) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [roadmapId, setRoadmapId] = useState(detail.roadmap?.id ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const voted = detail.votes.some((v) => v.userId === detail.currentUserId);

  const orgs = [...new Map(detail.signals.map((s) => [s.org.id, s.org])).values()];

  async function saveMeta() {
    setBusy(true);
    await fetch(`/api/requests/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        roadmapId: roadmapId || null,
      }),
    });
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
          {detail.tags.map((t) => (
            <Badge key={t.tag.id} className="bg-[var(--accent-soft)] text-[var(--accent)]">
              {t.tag.name}
            </Badge>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Requested by workspaces
          </h2>
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
            {detail.signals.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No linked signals.</p>
            ) : null}
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
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="note">Add note</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={addNote} disabled={busy || !note.trim()}>
              Add note
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
