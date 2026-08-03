"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PromoteToFeatureRequestButton({
  consolidationId,
}: Readonly<{ consolidationId: string }>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promote() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/consolidation/${consolidationId}/promote`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Promote failed");
      router.push(`/requests/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={promote} disabled={busy}>
        {busy ? "Promoting…" : "Promote to feature request"}
      </Button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
