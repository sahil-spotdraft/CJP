import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { listConsolidationsWithArr } from "@/lib/services/consolidation";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const data = await listConsolidationsWithArr();
  return NextResponse.json(data);
}
