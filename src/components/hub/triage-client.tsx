"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FeatureSignalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SignalStatusBadge } from "@/components/hub/status-badge";

type Org = { id: string; name: string; slug: string };
type Channel = { id: string; name: string; channelId: string };

type Signal = {
  id: string;
  status: FeatureSignalStatus;
  rawText: string;
  aiTitle: string | null;
  aiSummary: string | null;
  aiConfidence: number | null;
  aiTags: string[];
  permalink: string | null;
  triageNote: string | null;
  org: Org;
  channel: Channel;
  featureRequestId: string | null;
};

type Similar = {
  id: string;
  title: string;
  summary: string;
  status: string;
  voteCount: number;
  score: number;
  latestNote: string | null;
  tags: string[];
  orgs: Org[];
};

export function TriageClient({
  signal,
  similar,
}: {
  signal: Signal;
  similar: Similar[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [title, setTitle] = useState(signal.aiTitle || "");
  const [summary, setSummary] = useState(signal.aiSummary || signal.rawText);
  const [tags, setTags] = useState((signal.aiTags || []).join(", "));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(similar[0]?.id ?? null);

  const pending = signal.status === FeatureSignalStatus.PENDING;

  const selected = useMemo(
    () => similar.find((s) => s.id === selectedId) ?? null,
    [similar, selectedId],
  );

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (action === "create" && data.featureRequestId) {
        router.push(`/requests/${data.featureRequestId}`);
      } else if (action === "match" && data.featureRequestId) {
        router.push(`/requests/${data.featureRequestId}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl">Triage signal</h1>
          <SignalStatusBadge status={signal.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{signal.org.name}</Badge>
          <Badge>#{signal.channel.name}</Badge>
          {typeof signal.aiConfidence === "number" ? (
            <Badge>{Math.round(signal.aiConfidence * 100)}% confidence</Badge>
          ) : null}
          {signal.permalink ? (
            <a
              href={signal.permalink}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent)] underline"
            >
              Open in Slack
            </a>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-medium text-[var(--ink-muted)]">Original message</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-4 text-sm leading-relaxed">
            {signal.rawText}
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="title">Title (for new request)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!pending}
            />
          </div>
          <div>
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={!pending}
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={!pending}
            />
          </div>
          <div>
            <Label htmlFor="note">Note for this workspace</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Context from this customer / why it matters…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!pending}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        {pending ? (
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!selectedId || busy !== null}
              onClick={() =>
                run("match", () =>
                  fetch(`/api/signals/${signal.id}/match`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      featureRequestId: selectedId,
                      note,
                    }),
                  }),
                )
              }
            >
              {busy === "match" ? "Matching…" : "Match to selected"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy !== null || !title.trim() || !summary.trim()}
              onClick={() =>
                run("create", () =>
                  fetch(`/api/signals/${signal.id}/create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title,
                      summary,
                      note,
                      tags: tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }),
                  }),
                )
              }
            >
              {busy === "create" ? "Creating…" : "Create new request"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() =>
                run("dismiss", () =>
                  fetch(`/api/signals/${signal.id}/dismiss`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note }),
                  }),
                )
              }
            >
              {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            This signal is already {signal.status.toLowerCase()}
            {signal.featureRequestId ? (
              <>
                .{" "}
                <a className="text-[var(--accent)] underline" href={`/requests/${signal.featureRequestId}`}>
                  View request
                </a>
              </>
            ) : null}
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div>
          <h2 className="font-display text-2xl">Similar requests</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Match this Slack signal to an existing request to aggregate demand across workspaces.
          </p>
        </div>

        {similar.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--ink-muted)]">
            No similar requests yet. Create a new one from this signal.
          </div>
        ) : (
          <div className="space-y-3">
            {similar.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge>{Math.round(item.score * 100)}% match</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{item.status.replaceAll("_", " ")}</Badge>
                    <Badge>{item.voteCount} votes</Badge>
                    {item.orgs.map((org) => (
                      <Badge key={org.id} className="bg-[var(--surface)]">
                        {org.name}
                      </Badge>
                    ))}
                  </div>
                  {item.latestNote ? (
                    <p className="mt-3 line-clamp-2 text-xs text-[var(--ink-muted)]">
                      Note: {item.latestNote}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {selected ? (
          <div className="rounded-xl bg-[var(--surface-2)] p-4 text-sm">
            <p className="font-medium">Selected: {selected.title}</p>
            <p className="mt-1 text-[var(--ink-muted)]">
              Requested by{" "}
              {selected.orgs.length
                ? selected.orgs.map((o) => o.name).join(", ")
                : "no workspaces yet"}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
