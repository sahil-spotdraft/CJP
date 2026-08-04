import { notFound } from "next/navigation";
import { TriageClient } from "@/components/hub/triage-client";
import { findSimilarFeatureRequests, getSignalForTriage } from "@/lib/services/triage";

export const dynamic = "force-dynamic";

export default async function TriagePage({
  params,
}: {
  params: Promise<{ signalId: string }>;
}) {
  const { signalId } = await params;
  const signal = await getSignalForTriage(signalId);
  if (!signal) notFound();

  let similar: Awaited<ReturnType<typeof findSimilarFeatureRequests>> = [];
  try {
    similar = await findSimilarFeatureRequests(signalId);
  } catch (error) {
    console.error("Failed to load similar requests for triage", error);
  }

  return (
    <TriageClient
      signal={{
        id: signal.id,
        status: signal.status,
        rawText: signal.rawText,
        aiTitle: signal.aiTitle,
        aiSummary: signal.aiSummary,
        aiConfidence: signal.aiConfidence,
        aiTags: signal.aiTags,
        permalink: signal.permalink,
        triageNote: signal.triageNote,
        org: signal.org,
        channel: signal.channel,
        featureRequestId: signal.featureRequestId,
      }}
      similar={similar}
    />
  );
}
