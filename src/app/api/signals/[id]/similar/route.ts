import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { findSimilarFeatureRequests, getSignalForTriage } from "@/lib/services/triage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const signal = await getSignalForTriage(id);
  if (!signal) return jsonError("Signal not found", 404);

  const similar = await findSimilarFeatureRequests(id);
  return NextResponse.json({ signal, similar });
}
