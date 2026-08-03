import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { markSuggestionRead } from "@/lib/services/suggestions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const suggestion = await markSuggestionRead(id);
  if (!suggestion) return jsonError("Suggestion not found", 404);

  return NextResponse.json(suggestion);
}
