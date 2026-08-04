import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { spawnSlackCursorAgent } from "@/lib/cursor/spawn-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  channel: z.string().min(1).default("C0BMJFWC96J"),
  text: z.string().min(8),
  ts: z.string().optional(),
  user: z.string().optional(),
  thread_ts: z.string().optional(),
});

/**
 * Authenticated test harness: simulate a Slack message → Cursor agent.
 * POST /api/cursor/process-slack
 */
export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const ts = body.data.ts || `${Date.now() / 1000}`;
  const result = await spawnSlackCursorAgent({
    channel: body.data.channel,
    text: body.data.text,
    ts,
    user: body.data.user,
    thread_ts: body.data.thread_ts || ts,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
