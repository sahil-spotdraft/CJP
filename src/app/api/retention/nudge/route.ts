import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api";
import { triggerRetentionNudge } from "@/lib/services/retention";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as
    | { orgId?: string; templateId?: string }
    | null;
  if (!body?.orgId || !body?.templateId) {
    return jsonError("orgId and templateId are required");
  }

  try {
    const result = await triggerRetentionNudge({
      orgId: body.orgId,
      templateId: body.templateId,
      createdBy: session?.user?.email ?? session?.user?.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to trigger nudge", 400);
  }
}
