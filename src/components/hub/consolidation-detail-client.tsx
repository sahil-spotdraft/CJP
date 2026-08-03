"use client";

import { Button } from "@/components/ui/button";

export function PromoteToFeatureRequestButton() {
  return (
    <span
      className="inline-flex"
      title="This will take it to Product request dashboard"
    >
      <Button
        type="button"
        disabled
        className="pointer-events-none cursor-not-allowed opacity-50"
      >
        Promote to Product request dashboard
      </Button>
    </span>
  );
}
