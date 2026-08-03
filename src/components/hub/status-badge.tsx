import { ClmPriority, ClmRequestStatus, FeatureRequestStatus, FeatureSignalStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const requestColors: Record<FeatureRequestStatus, string> = {
  NEW: "bg-sky-100 text-sky-800",
  TRIAGED: "bg-indigo-100 text-indigo-800",
  PLANNED: "bg-amber-100 text-amber-900",
  IN_PROGRESS: "bg-orange-100 text-orange-900",
  SHIPPED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-rose-100 text-rose-800",
};

const signalColors: Record<FeatureSignalStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  MATCHED: "bg-emerald-100 text-emerald-800",
  DISMISSED: "bg-zinc-100 text-zinc-600",
};

export function RequestStatusBadge({ status }: { status: FeatureRequestStatus }) {
  return (
    <Badge className={requestColors[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function SignalStatusBadge({ status }: { status: FeatureSignalStatus }) {
  return (
    <Badge className={signalColors[status]}>
      {status}
    </Badge>
  );
}

const clmStatusColors: Record<ClmRequestStatus, string> = {
  NEW: "bg-sky-100 text-sky-800",
  DISCUSSED_WITH_PRODUCT: "bg-yellow-100 text-yellow-900",
  SHARED_WITH_PRODUCT: "bg-violet-100 text-violet-900",
  IN_ROADMAP: "bg-indigo-100 text-indigo-800",
  CLOSED: "bg-zinc-100 text-zinc-700",
  PLANNED: "bg-amber-100 text-amber-900",
  IN_PROGRESS: "bg-orange-100 text-orange-900",
  SHIPPED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-rose-100 text-rose-800",
};

const clmPriorityColors: Record<ClmPriority, string> = {
  CRITICAL: "bg-rose-100 text-rose-800",
  HIGH: "bg-orange-100 text-orange-900",
  MEDIUM: "bg-amber-100 text-amber-900",
  LOW: "bg-emerald-100 text-emerald-800",
};

const clmPriorityDot: Record<ClmPriority, string> = {
  CRITICAL: "bg-rose-500",
  HIGH: "bg-orange-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-emerald-500",
};

export function ClmStatusBadge({ status }: Readonly<{ status: ClmRequestStatus }>) {
  return <Badge className={clmStatusColors[status]}>{status.replaceAll("_", " ")}</Badge>;
}

export function ClmPriorityBadge({ priority }: Readonly<{ priority: ClmPriority }>) {
  return (
    <Badge className={clmPriorityColors[priority]}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${clmPriorityDot[priority]}`} />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </Badge>
  );
}
