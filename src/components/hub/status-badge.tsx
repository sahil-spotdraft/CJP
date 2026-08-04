import {
  ClmPriority,
  ClmRequestStatus,
  FeatureRequestStatus,
  FeatureSignalStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";

/** Soft badge fills — brand-aligned sage/teal family (see globals.css). */
const requestColors: Record<FeatureRequestStatus, string> = {
  NEW: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  TRIAGED: "bg-[var(--status-triaged-bg)] text-[var(--status-triaged-fg)]",
  PLANNED: "bg-[var(--status-planned-bg)] text-[var(--status-planned-fg)]",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  SHIPPED: "bg-[var(--status-shipped-bg)] text-[var(--status-shipped-fg)]",
  DECLINED: "bg-[var(--status-declined-bg)] text-[var(--status-declined-fg)]",
};

const signalColors: Record<FeatureSignalStatus, string> = {
  PENDING: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
  MATCHED: "bg-[var(--status-matched-bg)] text-[var(--status-matched-fg)]",
  DISMISSED: "bg-[var(--status-dismissed-bg)] text-[var(--status-dismissed-fg)]",
};

const clmStatusColors: Record<ClmRequestStatus, string> = {
  NEW: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  DISCUSSED_WITH_PRODUCT:
    "bg-[var(--status-discussed-bg)] text-[var(--status-discussed-fg)]",
  SHARED_WITH_PRODUCT: "bg-[var(--status-shared-bg)] text-[var(--status-shared-fg)]",
  IN_ROADMAP: "bg-[var(--status-roadmap-bg)] text-[var(--status-roadmap-fg)]",
  CLOSED: "bg-[var(--status-closed-bg)] text-[var(--status-closed-fg)]",
  PLANNED: "bg-[var(--status-planned-bg)] text-[var(--status-planned-fg)]",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  SHIPPED: "bg-[var(--status-shipped-bg)] text-[var(--status-shipped-fg)]",
  DECLINED: "bg-[var(--status-declined-bg)] text-[var(--status-declined-fg)]",
};

const clmPriorityColors: Record<ClmPriority, string> = {
  CRITICAL: "bg-[var(--priority-critical-bg)] text-[var(--priority-critical-fg)]",
  HIGH: "bg-[var(--priority-high-bg)] text-[var(--priority-high-fg)]",
  MEDIUM: "bg-[var(--priority-medium-bg)] text-[var(--priority-medium-fg)]",
  LOW: "bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]",
};

const clmPriorityDot: Record<ClmPriority, string> = {
  CRITICAL: "bg-[var(--chart-critical)]",
  HIGH: "bg-[var(--chart-high)]",
  MEDIUM: "bg-[var(--chart-medium)]",
  LOW: "bg-[var(--chart-low)]",
};

/** Solid chart / bar fills — same semantic map as badges. */
export const statusChartColors: Record<string, string> = {
  NEW: "bg-[var(--chart-new)]",
  SHARED_WITH_PRODUCT: "bg-[var(--chart-shared)]",
  DISCUSSED_WITH_PRODUCT: "bg-[var(--chart-discussed)]",
  IN_ROADMAP: "bg-[var(--chart-roadmap)]",
  PLANNED: "bg-[var(--chart-planned)]",
  IN_PROGRESS: "bg-[var(--chart-progress)]",
  SHIPPED: "bg-[var(--chart-shipped)]",
  DECLINED: "bg-[var(--chart-declined)]",
  CLOSED: "bg-[var(--chart-closed)]",
  TRIAGED: "bg-[var(--chart-shared)]",
};

export const priorityChartColors: Record<string, string> = {
  CRITICAL: "bg-[var(--chart-critical)]",
  HIGH: "bg-[var(--chart-high)]",
  MEDIUM: "bg-[var(--chart-medium)]",
  LOW: "bg-[var(--chart-low)]",
  NOT_SET: "bg-[var(--chart-neutral)]",
};

export function RequestStatusBadge({ status }: { status: FeatureRequestStatus }) {
  return (
    <Badge className={requestColors[status]}>{status.replaceAll("_", " ")}</Badge>
  );
}

export function SignalStatusBadge({ status }: { status: FeatureSignalStatus }) {
  return <Badge className={signalColors[status]}>{status}</Badge>;
}

export function ClmStatusBadge({ status }: Readonly<{ status: ClmRequestStatus }>) {
  return (
    <Badge className={clmStatusColors[status]}>{status.replaceAll("_", " ")}</Badge>
  );
}

export function ClmPriorityBadge({ priority }: Readonly<{ priority: ClmPriority }>) {
  return (
    <Badge className={clmPriorityColors[priority]}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${clmPriorityDot[priority]}`}
      />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </Badge>
  );
}
