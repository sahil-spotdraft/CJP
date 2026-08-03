"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SuggestionSidePanel } from "@/components/hub/suggestion-side-panel";

export type SuggestionListItem = {
  id: string;
  title: string;
  summary: string;
  status: string;
  sourceLabel: string;
  readAt: string | null;
  createdAt: string;
  matchCount: number;
  unread: boolean;
};

type ListResponse = {
  unreadCount: number;
  suggestions: SuggestionListItem[];
};

const POLL_MS = 4000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions");
      if (!res.ok) return;
      const data = (await res.json()) as ListResponse;
      setUnreadCount(data.unreadCount);
      setSuggestions(data.suggestions);
    } catch {
      // ignore poll errors during demo
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function openSuggestion(id: string) {
    setSelectedId(id);
    setOpen(false);
  }

  function handlePanelClose() {
    setSelectedId(null);
    void refresh();
  }

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] transition",
            "hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
            open && "bg-[var(--surface-2)] text-[var(--ink)]",
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <div className="border-b border-[var(--border)] px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--ink)]">Suggestions</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {unreadCount > 0
                  ? `${unreadCount} unread from Slack`
                  : "No unread suggestions"}
              </p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {suggestions.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--ink-muted)]">
                  Run the demo seed script to create a suggestion.
                </li>
              ) : (
                suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        // Open on mousedown so closing the dropdown can't swallow the click.
                        event.preventDefault();
                        event.stopPropagation();
                        openSuggestion(item.id);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]",
                        item.unread && "bg-[var(--accent-soft)]/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-medium text-[var(--ink)]">
                          {item.title}
                        </span>
                        {item.unread ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-xs text-[var(--ink-muted)]">
                        {item.summary}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        <Badge className="capitalize">{item.sourceLabel}</Badge>
                        <Badge>{item.matchCount} matches</Badge>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedId ? (
        <SuggestionSidePanel suggestionId={selectedId} onClose={handlePanelClose} />
      ) : null}
    </>
  );
}
