"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  arr: number | null;
};

type Match = {
  id: string;
  matchPercent: number;
  featureRequest: {
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
    tags: string[];
    workspaces: Workspace[];
  };
};

type SuggestionDetail = {
  id: string;
  title: string;
  summary: string;
  status: string;
  rawText: string | null;
  sourceLabel: string;
  tags: string[];
  readAt: string | null;
  createdAt: string;
  unread: boolean;
  triageStatus: "PENDING" | "MATCHED" | "CREATED" | "DISMISSED";
  triageNote: string | null;
  featureRequestId: string | null;
  productRequestId: string | null;
  featureRequest: { id: string; title: string } | null;
  requestingWorkspaces: Workspace[];
  allWorkspaces: Workspace[];
  matches: Match[];
};

function formatArr(arr: number | null) {
  if (arr == null) return null;
  return `$${Math.round(arr).toLocaleString()}`;
}

export function SuggestionSidePanel({
  suggestionId,
  onClose,
}: {
  suggestionId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SuggestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const readRes = await fetch(`/api/suggestions/${suggestionId}/read`, {
          method: "POST",
        });
        const data = await readRes.json();
        if (!readRes.ok) throw new Error(data.error || "Failed to load suggestion");
        if (cancelled) return;
        const suggestion = data as SuggestionDetail;
        setDetail(suggestion);
        setTitle(suggestion.title);
        setSummary(suggestion.summary);
        setTags((suggestion.tags || []).join(", "));
        setSelectedRequestId(suggestion.matches[0]?.featureRequest.id ?? null);
        setSelectedWorkspaceIds(suggestion.requestingWorkspaces.map((w) => w.id));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load suggestion");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [suggestionId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pending = detail?.triageStatus === "PENDING";

  const selectedMatch = useMemo(
    () => detail?.matches.find((m) => m.featureRequest.id === selectedRequestId) ?? null,
    [detail, selectedRequestId],
  );

  function toggleWorkspace(id: string) {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDetail(data as SuggestionDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Close panel backdrop"
        className="absolute inset-0 bg-[var(--ink)]/25"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-label">
              Suggestion
            </p>
            <h2 className="mt-1 font-display text-xl text-[var(--ink)]">
              {detail?.title ?? (loading ? "Loading…" : "Suggestion")}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}

          {loading && !detail ? (
            <p className="text-sm text-[var(--ink-muted)]">Loading suggestion details…</p>
          ) : null}

          {detail ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="capitalize">{detail.sourceLabel}</Badge>
                  <Badge>{detail.triageStatus.replaceAll("_", " ")}</Badge>
                  {detail.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[var(--ink)]">{detail.summary}</p>
                {detail.rawText ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="mb-1 text-label">
                      Original Slack message
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                      {detail.rawText}
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--ink)]">
                    Workspaces requesting this
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Select workspaces to attach when you match or create a request
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.allWorkspaces.map((ws) => {
                    const checked = selectedWorkspaceIds.includes(ws.id);
                    const fromSuggestion = detail.requestingWorkspaces.some(
                      (r) => r.id === ws.id,
                    );
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        disabled={!pending}
                        onClick={() => toggleWorkspace(ws.id)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
                          checked
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)]",
                          !pending && "opacity-60",
                        )}
                      >
                        <span className="font-medium">{ws.name}</span>
                        {formatArr(ws.arr) ? (
                          <span className="ml-1 opacity-80">{formatArr(ws.arr)}</span>
                        ) : null}
                        {fromSuggestion ? (
                          <span className="ml-1 opacity-70">· asked</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--ink)]">Matching requests</h3>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Select one to match, or create a new request below
                  </p>
                </div>

                {detail.matches.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">
                    No matching requests. Create a new one from this suggestion.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {detail.matches.map((match) => {
                      const active = match.featureRequest.id === selectedRequestId;
                      return (
                        <li key={match.id}>
                          <button
                            type="button"
                            disabled={!pending}
                            onClick={() => setSelectedRequestId(match.featureRequest.id)}
                            className={cn(
                              "w-full rounded-xl border p-3 text-left transition",
                              active
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-[var(--border)] hover:border-[var(--accent)]",
                              !pending && "opacity-70",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <p className="line-clamp-2 text-sm font-medium text-[var(--ink)]">
                                  {match.featureRequest.title}
                                </p>
                                <p className="line-clamp-2 text-xs text-[var(--ink-muted)]">
                                  {match.featureRequest.summary}
                                </p>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  <Badge>{match.featureRequest.status}</Badge>
                                  {match.featureRequest.tags.map((tag) => (
                                    <Badge key={tag}>{tag}</Badge>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {match.featureRequest.workspaces.length === 0 ? (
                                    <span className="text-[11px] text-[var(--ink-muted)]">
                                      No workspaces on this request yet
                                    </span>
                                  ) : (
                                    match.featureRequest.workspaces.map((ws) => (
                                      <Badge key={ws.id} className="bg-[var(--surface)]">
                                        {ws.name}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-[var(--surface)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
                                {match.matchPercent}%
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedMatch ? (
                  <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--ink-muted)]">
                    Selected:{" "}
                    <span className="font-medium text-[var(--ink)]">
                      {selectedMatch.featureRequest.title}
                    </span>
                    . Already requested by{" "}
                    {selectedMatch.featureRequest.workspaces.length
                      ? selectedMatch.featureRequest.workspaces.map((w) => w.name).join(", ")
                      : "no workspaces yet"}
                    .
                  </div>
                ) : null}
              </section>

              {pending ? (
                <section className="space-y-3 border-t border-[var(--border)] pt-4">
                  <div>
                    <Label htmlFor="suggestion-title">Title (for new request)</Label>
                    <Input
                      id="suggestion-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="suggestion-summary">Summary</Label>
                    <Textarea
                      id="suggestion-summary"
                      rows={3}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="suggestion-tags">Tags (comma-separated)</Label>
                    <Input
                      id="suggestion-tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="suggestion-note">Note</Label>
                    <Textarea
                      id="suggestion-note"
                      rows={2}
                      placeholder="Why this matters for the selected workspaces…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!selectedRequestId || busy !== null}
                      onClick={() =>
                        run("match", () =>
                          fetch(`/api/suggestions/${detail.id}/match`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              featureRequestId: selectedRequestId,
                              workspaceIds: selectedWorkspaceIds,
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
                          fetch(`/api/suggestions/${detail.id}/create`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title,
                              summary,
                              note,
                              workspaceIds: selectedWorkspaceIds,
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
                  </div>
                </section>
              ) : (
                <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                  <p>
                    This suggestion is already{" "}
                    <span className="font-medium">{detail.triageStatus.toLowerCase()}</span>
                    {detail.productRequestId ? (
                      <>
                        .{" "}
                        <Link
                          href={`/product-requests/${detail.productRequestId}`}
                          className="text-[var(--accent)] underline"
                        >
                          View request
                        </Link>
                      </>
                    ) : detail.featureRequestId ? (
                      <>
                        .{" "}
                        <Link
                          href="/product-requests"
                          className="text-[var(--accent)] underline"
                        >
                          View product requests
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {detail.requestingWorkspaces.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-[var(--ink-muted)]">Workspaces:</span>
                      {detail.requestingWorkspaces.map((ws) => (
                        <Badge key={ws.id}>{ws.name}</Badge>
                      ))}
                    </div>
                  ) : null}
                  {detail.matches
                    .filter((m) => m.featureRequest.id === detail.featureRequestId)
                    .map((m) =>
                      m.featureRequest.workspaces.length > 0 ? (
                        <div key={m.id} className="flex flex-wrap gap-1.5">
                          <span className="text-xs text-[var(--ink-muted)]">
                            On matched request:
                          </span>
                          {m.featureRequest.workspaces.map((ws) => (
                            <Badge key={ws.id}>{ws.name}</Badge>
                          ))}
                        </div>
                      ) : null,
                    )}
                </section>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
