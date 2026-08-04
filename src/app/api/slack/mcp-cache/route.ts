import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { jsonError } from "@/lib/api";
import { runSlackPollCycle } from "@/lib/slack/poller";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  messages: z.array(
    z.object({
      ts: z.string(),
      text: z.string(),
      user: z.string().optional(),
      thread_ts: z.string().optional(),
      subtype: z.string().optional(),
      bot_id: z.string().optional(),
    }),
  ),
  channelId: z.string().optional(),
  runPoll: z.boolean().optional().default(true),
});

/**
 * Refresh MCP message cache (used when SLACK_BOT_TOKEN cannot read history).
 * POST /api/slack/mcp-cache
 */
export async function POST(req: NextRequest) {
  // Allow local/dev without session so Cursor automations can push snapshots.
  const secret = process.env.SLACK_CACHE_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-moonshot-secret");
    if (provided !== secret) return jsonError("Unauthorized", 401);
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const out = {
    fetchedAt: new Date().toISOString(),
    channelId: body.data.channelId || process.env.SLACK_POLL_CHANNEL_ID || "C0BMJFWC96J",
    messages: body.data.messages,
  };

  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "slack-mcp-cache.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );

  let poll = null;
  if (body.data.runPoll) {
    poll = await runSlackPollCycle();
  }

  return NextResponse.json({ ok: true, cached: out.messages.length, poll });
}
