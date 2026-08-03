import { NextRequest, NextResponse } from "next/server";
import { handleSlackMessage, type IncomingSlackMessage } from "@/lib/services/ingest";
import { verifySlackSignature } from "@/lib/slack/verify";

export const runtime = "nodejs";

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

  const valid = verifySlackSignature({
    signature: req.headers.get("x-slack-signature"),
    timestamp: req.headers.get("x-slack-request-timestamp"),
    rawBody,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.type === "event_callback" && payload.event?.type === "message") {
    // Acknowledge quickly; process inline for simplicity in v1.
    // Slack retries if we exceed ~3s; keep classification fast / heuristic fallback.
    try {
      await handleSlackMessage(payload.event);
    } catch (error) {
      console.error("Slack message handling failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
