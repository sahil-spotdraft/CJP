import { after, NextRequest, NextResponse } from "next/server";
import { spawnSlackCursorAgent, toAgentPayload } from "@/lib/cursor/spawn-agent";
import { hasSlackSigningSecret } from "@/lib/env";
import { handleSlackMessage, type IncomingSlackMessage } from "@/lib/services/ingest";
import { verifySlackSignature } from "@/lib/slack/verify";

export const runtime = "nodejs";
export const maxDuration = 300;

type SlackEventPayload = {
  type?: string;
  challenge?: string;
  event?: IncomingSlackMessage & { type?: string };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: SlackEventPayload;
  try {
    payload = JSON.parse(rawBody) as SlackEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (hasSlackSigningSecret()) {
    const valid = verifySlackSignature({
      signature: req.headers.get("x-slack-signature"),
      timestamp: req.headers.get("x-slack-request-timestamp"),
      rawBody,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("SLACK_SIGNING_SECRET missing — skipping signature verification (dev only)");
  }

  if (payload.type === "event_callback" && payload.event?.type === "message") {
    const event = payload.event;
    const agentPayload = toAgentPayload(event);

    // Fast structured ingest (heuristic/OpenAI) — keep as backup path.
    after(async () => {
      try {
        await handleSlackMessage(event);
      } catch (error) {
        console.error("Slack message handling failed", error);
      }

      if (!agentPayload) return;
      try {
        const result = await spawnSlackCursorAgent(agentPayload);
        console.log("Cursor agent result", result);
      } catch (error) {
        console.error("Cursor agent spawn failed", error);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
