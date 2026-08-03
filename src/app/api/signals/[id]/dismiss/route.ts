import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { dismissSignal } from "@/lib/services/triage";

const schema = z.object({
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return jsonError(body.error.message);

  try {
    const signal = await dismissSignal({ signalId: id, note: body.data.note });
    return NextResponse.json(signal);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Dismiss failed", 400);
  }
}
