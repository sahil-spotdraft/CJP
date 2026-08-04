import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api";
import { sendRetentionSlackAlert } from "@/lib/services/retention";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as
    | { orgId?: string; channel?: string }
    | null;
  if (!body?.orgId) return jsonError("orgId is required");

  try {
    const result = await sendRetentionSlackAlert({
      orgId: body.orgId,
      channelOverride: body.channel,
      createdBy: session?.user?.email ?? session?.user?.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to send alert", 400);
  }
}
