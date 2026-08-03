import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { matchSignalToRequest } from "@/lib/services/triage";

const schema = z.object({
  featureRequestId: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const signal = await matchSignalToRequest({
      signalId: id,
      featureRequestId: body.data.featureRequestId,
      note: body.data.note,
      authorId: session!.user.id,
    });
    return NextResponse.json(signal);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Match failed", 400);
  }
}
