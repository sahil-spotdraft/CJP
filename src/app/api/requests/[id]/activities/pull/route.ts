import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { pullRandomActivityFromSource } from "@/lib/services/activity-templates";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  try {
    const activity = await pullRandomActivityFromSource({
      featureRequestId: id,
      authorId: session!.user.id,
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to pull activity";
    const status =
      message.includes("not found") ? 404 :
      message.includes("source") ? 400 :
      500;
    return jsonError(message, status);
  }
}
