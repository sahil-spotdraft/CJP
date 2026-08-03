import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { listSuggestions } from "@/lib/services/suggestions";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const data = await listSuggestions();
  return NextResponse.json(data);
}
