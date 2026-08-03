import { FeatureRequestStatus, FeatureSignalStatus } from "@prisma/client";
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
