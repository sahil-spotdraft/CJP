import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { createRequestFromSignal } from "@/lib/services/triage";

const schema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
    const signal = await createRequestFromSignal({
      signalId: id,
      title: body.data.title,
      summary: body.data.summary,
      note: body.data.note,
      tags: body.data.tags,
      authorId: session!.user.id,
    });
    return NextResponse.json(signal, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Create failed", 400);
  }
}
