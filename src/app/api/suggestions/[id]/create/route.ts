import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { createRequestFromSuggestion } from "@/lib/services/suggestions";

const schema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).optional(),
  workspaceIds: z.array(z.string()).optional(),
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
    const suggestion = await createRequestFromSuggestion({
      suggestionId: id,
      title: body.data.title,
      summary: body.data.summary,
      tags: body.data.tags,
      workspaceIds: body.data.workspaceIds,
      note: body.data.note,
      authorId: session!.user.id,
    });
    return NextResponse.json(suggestion, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Create failed", 400);
  }
}
