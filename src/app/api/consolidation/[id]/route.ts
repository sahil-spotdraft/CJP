import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { getConsolidationDetail } from "@/lib/services/consolidation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const detail = await getConsolidationDetail(id);
  if (!detail) return jsonError("Not found", 404);

  return NextResponse.json(detail);
}
