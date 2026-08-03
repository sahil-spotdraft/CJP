import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { getSuggestionDetail } from "@/lib/services/suggestions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const suggestion = await getSuggestionDetail(id);
  if (!suggestion) return jsonError("Suggestion not found", 404);

  return NextResponse.json(suggestion);
}
