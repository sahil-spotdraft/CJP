"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function OrgArrEditor({
  orgId,
  initialArr,
}: Readonly<{ orgId: string; initialArr: number | null }>) {
  const router = useRouter();
  const [value, setValue] = useState(initialArr != null ? String(initialArr) : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arr: value ? Number(value) : null }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label htmlFor="arr">Account ARR</Label>
        <Input
          id="arr"
          type="number"
          min={0}
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="250000"
          className="w-40"
        />
      </div>
      <Button onClick={save} disabled={busy} variant="secondary">
        {busy ? "Saving…" : "Save ARR"}
      </Button>
    </div>
  );
}
