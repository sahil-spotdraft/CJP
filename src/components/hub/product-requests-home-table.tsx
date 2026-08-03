"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClmPriority, ClmRequestStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ProductRequestRow = {
  id: string;
  wsId: string;
  wsName: string;
  ask: string;
  consolidation: { id: string; name: string; feature: string | null } | null;
  /** All workspaces asking for the same feature/consolidation (can be many). */
  relatedWsNames: string[];
  csOwner: string | null;
  priority: ClmPriority | null;
  status: ClmRequestStatus;
  productNotes: string | null;
  timeline: string | null;
  csNotes: string | null;
};

type FilterKey = "csOwner" | "priority" | "status";

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function ProductRequestsHomeTable({
  requests = [],
}: Readonly<{ requests?: ProductRequestRow[] }>) {
  const router = useRouter();
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [wsNameQuery, setWsNameQuery] = useState("");
  const [csOwner, setCsOwner] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  const options = useMemo(
    () => ({
      csOwners: uniqueSorted(requests.map((r) => r.csOwner ?? "")),
      priorities: Object.values(ClmPriority),
      statuses: Object.values(ClmRequestStatus),
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = wsNameQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const wsNames = r.relatedWsNames.length ? r.relatedWsNames : [r.wsName];
      if (q && !wsNames.some((name) => name.toLowerCase().includes(q))) return false;
      if (csOwner && (r.csOwner ?? "") !== csOwner) return false;
      if (priority && r.priority !== priority) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [requests, wsNameQuery, csOwner, priority, status]);

  const active = {
    csOwner: Boolean(csOwner),
    priority: Boolean(priority),
    status: Boolean(status),
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--ink-muted)]">
        No feature requests yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label htmlFor="ws-search" className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          Search by WS Name
        </label>
        <Input
          id="ws-search"
          value={wsNameQuery}
          onChange={(e) => setWsNameQuery(e.target.value)}
          placeholder="Type a workspace name…"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="px-4 py-3 font-medium">Feature request</th>
              <th className="px-4 py-3 font-medium">WS Name</th>
              <th className="px-4 py-3 font-medium">Request / Ask</th>
              <ColumnHeader
                label="CS Owner"
                active={active.csOwner}
                open={openFilter === "csOwner"}
                onToggle={() => setOpenFilter((v) => (v === "csOwner" ? null : "csOwner"))}
                onClose={() => setOpenFilter(null)}
              >
                <DropdownList
                  options={options.csOwners}
                  value={csOwner}
                  onChange={(v) => {
                    setCsOwner(v);
                    setOpenFilter(null);
                  }}
                />
              </ColumnHeader>
              <ColumnHeader
                label="Priority"
                active={active.priority}
                open={openFilter === "priority"}
                onToggle={() => setOpenFilter((v) => (v === "priority" ? null : "priority"))}
                onClose={() => setOpenFilter(null)}
              >
                <DropdownList
                  options={options.priorities}
                  value={priority}
                  formatLabel={(v) => v.charAt(0) + v.slice(1).toLowerCase()}
                  onChange={(v) => {
                    setPriority(v);
                    setOpenFilter(null);
                  }}
                />
              </ColumnHeader>
              <ColumnHeader
                label="Status"
                active={active.status}
                open={openFilter === "status"}
                onToggle={() => setOpenFilter((v) => (v === "status" ? null : "status"))}
                onClose={() => setOpenFilter(null)}
              >
                <DropdownList
                  options={options.statuses}
                  value={status}
                  formatLabel={(v) => v.replaceAll("_", " ")}
                  onChange={(v) => {
                    setStatus(v);
                    setOpenFilter(null);
                  }}
                />
              </ColumnHeader>
              <th className="px-4 py-3 font-medium">Product Notes</th>
              <th className="px-4 py-3 font-medium">Timeline</th>
              <th className="px-4 py-3 font-medium">CS Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const wsNames = row.relatedWsNames.length ? row.relatedWsNames : [row.wsName];
              return (
                <tr
                  key={row.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/product-requests/${row.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/product-requests/${row.id}`);
                    }
                  }}
                  className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent-soft)]/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {row.consolidation?.name || "Unassigned"}
                    </div>
                    {row.consolidation?.feature ? (
                      <div className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {row.consolidation.feature}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {wsNames.map((name) => (
                        <Badge key={name}>{name}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[280px] font-medium">{row.ask}</td>
                  <td className="px-4 py-3">{row.csOwner || "—"}</td>
                  <td className="px-4 py-3">
                    {row.priority ? <ClmPriorityBadge priority={row.priority} /> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ClmStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-[var(--ink-muted)]">
                    {row.productNotes || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.timeline || "—"}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-[var(--ink-muted)]">
                    {row.csNotes || "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[var(--ink-muted)]">
                  No requests match the current search or column filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnHeader({
  label,
  active,
  open,
  onToggle,
  onClose,
  children,
}: Readonly<{
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  return (
    <th ref={ref} className="relative px-4 py-3 font-medium">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 uppercase tracking-wide transition hover:bg-white/70",
          active || open ? "text-[var(--accent)]" : "text-[var(--ink-muted)]",
        )}
      >
        {label}
        <FilterChevron active={active || open} />
      </button>
      {open ? (
        <div
          className="absolute left-2 top-full z-20 mt-1 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </th>
  );
}

function DropdownList({
  options,
  value,
  onChange,
  formatLabel,
}: Readonly<{
  options: string[];
  value: string;
  onChange: (value: string) => void;
  formatLabel?: (value: string) => string;
}>) {
  return (
    <div className="max-h-56 w-52 overflow-y-auto text-left normal-case tracking-normal">
      <button
        type="button"
        className={cn(
          "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]",
          !value ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]" : "text-[var(--ink)]",
        )}
        onClick={() => onChange("")}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={cn(
            "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]",
            value === opt
              ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "text-[var(--ink)]",
          )}
          onClick={() => onChange(opt)}
        >
          {formatLabel ? formatLabel(opt) : opt}
        </button>
      ))}
      {options.length === 0 ? (
        <p className="px-3 py-2 text-sm text-[var(--ink-muted)]">No values</p>
      ) : null}
    </div>
  );
}

function FilterChevron({ active }: Readonly<{ active: boolean }>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden
      className={cn("opacity-70", active && "opacity-100")}
    >
      <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
