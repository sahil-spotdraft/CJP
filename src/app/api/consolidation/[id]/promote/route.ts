import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { promoteConsolidationToFeatureRequest } from "@/lib/services/consolidation";

const schema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
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
    const featureRequest = await promoteConsolidationToFeatureRequest({
      consolidationId: id,
      title: body.data.title,
      summary: body.data.summary,
    });
    return NextResponse.json(featureRequest, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Promote failed", 400);
  }
}
