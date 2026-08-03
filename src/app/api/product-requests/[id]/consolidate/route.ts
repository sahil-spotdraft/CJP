import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import {
  consolidateProductRequest,
  serializeProductRequest,
  unconsolidateProductRequest,
} from "@/lib/services/consolidation";

const schema = z.object({
  consolidationId: z.string().optional(),
  newConsolidationName: z.string().optional(),
  feature: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const request = await consolidateProductRequest({
      productRequestId: id,
      consolidationId: body.data.consolidationId,
      newConsolidationName: body.data.newConsolidationName,
      feature: body.data.feature,
    });
    return NextResponse.json(serializeProductRequest(request));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Consolidate failed", 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  try {
    const request = await unconsolidateProductRequest(id);
    return NextResponse.json(serializeProductRequest(request));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to unassign", 400);
  }
}
