import { Agent, CursorAgentError } from "@cursor/sdk";
import type { SDKCustomTool, SDKJsonValue } from "@cursor/sdk";
import { FeatureSignalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv, hasCursor } from "@/lib/env";
import type { IncomingSlackMessage } from "@/lib/services/ingest";

function toolArgs<T extends Record<string, unknown>>(args: Record<string, SDKJsonValue>): T {
  return args as unknown as T;
}

function asToolExecute<T extends Record<string, unknown>>(
  fn: (args: T) => Promise<unknown> | unknown,
): SDKCustomTool["execute"] {
  return async (args) => (await fn(toolArgs<T>(args))) as SDKJsonValue;
}

export type SlackAgentPayload = {
  channel: string;
  text: string;
  ts: string;
  user?: string;
  thread_ts?: string;
};

function buildPrompt(payload: SlackAgentPayload): string {
  return `You are the Moonshot Feature Hub triage agent.

A new Slack message arrived. Use the provided tools to update the database.
Do not invent channel mappings — resolve the org via tools.

Slack message:
- channel_id: ${payload.channel}
- ts: ${payload.ts}
- thread_ts: ${payload.thread_ts ?? payload.ts}
- user: ${payload.user ?? "unknown"}
- text:
"""
${payload.text}
"""

Steps:
1. Call ensure_channel_mapped for this channel_id (name hint: cjp_customer_org if unknown).
2. Decide if this is a product feature request / capability ask (not chitchat, not join messages).
3. If YES: call upsert_pending_signal with a short title, 1-2 sentence summary, confidence 0-1, and optional tags.
   Then call notify_feature_detected(title, signalId from upsert result, channelId, summary).
4. If similar open feature requests exist, call list_similar_requests then optionally leave a note via add_request_note after matching — for now prefer creating/updating the pending signal only unless an obvious duplicate title exists.
5. If NO: call dismiss_noise with a short reason.
6. Reply with a one-line summary of what you wrote to the DB.
`;
}

async function ensureChannelMapped(args: {
  channelId: string;
  channelName?: string;
  orgName?: string;
}) {
  const channelId = String(args.channelId || "").trim();
  if (!channelId) return { error: "channelId required" };

  const existing = await prisma.slackChannel.findUnique({
    where: { channelId },
    include: { org: true },
  });
  if (existing) {
    return {
      channelPk: existing.id,
      channelId: existing.channelId,
      name: existing.name,
      orgId: existing.orgId,
      orgName: existing.org.name,
      enabled: existing.enabled,
    };
  }

  const orgName = (args.orgName || "CJP Customer Org").trim();
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "customer-org";

  const org = await prisma.customerOrg.upsert({
    where: { slug },
    update: { name: orgName },
    create: { name: orgName, slug },
  });

  const channel = await prisma.slackChannel.create({
    data: {
      channelId,
      name: (args.channelName || channelId).replace(/^#/, ""),
      enabled: true,
      orgId: org.id,
    },
    include: { org: true },
  });

  return {
    channelPk: channel.id,
    channelId: channel.channelId,
    name: channel.name,
    orgId: channel.orgId,
    orgName: channel.org.name,
    enabled: channel.enabled,
    created: true,
  };
}

async function upsertPendingSignal(args: {
  channelId: string;
  slackTs: string;
  threadTs?: string;
  text: string;
  title: string;
  summary: string;
  confidence?: number;
  tags?: string[];
  slackUserId?: string;
  slackUserName?: string;
}) {
  const channel = await prisma.slackChannel.findUnique({
    where: { channelId: String(args.channelId) },
  });
  if (!channel) return { error: "channel_not_mapped", hint: "call ensure_channel_mapped first" };

  const signal = await prisma.featureSignal.upsert({
    where: {
      channelId_slackTs: {
        channelId: channel.id,
        slackTs: String(args.slackTs),
      },
    },
    create: {
      status: FeatureSignalStatus.PENDING,
      rawText: String(args.text),
      aiTitle: String(args.title).slice(0, 120),
      aiSummary: String(args.summary).slice(0, 500),
      aiConfidence: typeof args.confidence === "number" ? args.confidence : 0.8,
      aiTags: Array.isArray(args.tags) ? args.tags.map(String) : [],
      slackUserId: args.slackUserId ? String(args.slackUserId) : null,
      slackUserName: args.slackUserName ? String(args.slackUserName) : null,
      slackTs: String(args.slackTs),
      threadTs: String(args.threadTs || args.slackTs),
      orgId: channel.orgId,
      channelId: channel.id,
    },
    update: {
      status: FeatureSignalStatus.PENDING,
      rawText: String(args.text),
      aiTitle: String(args.title).slice(0, 120),
      aiSummary: String(args.summary).slice(0, 500),
      aiConfidence: typeof args.confidence === "number" ? args.confidence : 0.8,
      aiTags: Array.isArray(args.tags) ? args.tags.map(String) : [],
    },
  });

  return {
    signalId: signal.id,
    triageUrl: `${getEnv().APP_BASE_URL}/triage/${signal.id}`,
    status: signal.status,
  };
}

async function listSimilarRequests(args: { query: string; limit?: number }) {
  const q = String(args.query || "").trim();
  if (!q) return { items: [] };
  const limit = Math.min(Number(args.limit) || 5, 10);

  const items = await prisma.featureRequest.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      signals: { include: { org: true }, take: 10 },
      _count: { select: { votes: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return {
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      status: r.status,
      votes: r._count.votes,
      orgs: [...new Set(r.signals.map((s) => s.org.name))],
      url: `${getEnv().APP_BASE_URL}/requests/${r.id}`,
    })),
  };
}

async function addRequestNote(args: { featureRequestId: string; body: string }) {
  const note = await prisma.featureRequestNote.create({
    data: {
      featureRequestId: String(args.featureRequestId),
      body: String(args.body),
    },
  });
  return { noteId: note.id };
}

async function dismissNoise(args: { reason: string }) {
  return { dismissed: true, reason: String(args.reason || "not a feature request") };
}

async function notifyFeatureDetected(args: {
  title: string;
  signalId?: string;
  channelId?: string;
  summary?: string;
}) {
  const env = getEnv();
  const title = String(args.title || "Feature request detected");
  const triageUrl = args.signalId
    ? `${env.APP_BASE_URL}/triage/${args.signalId}`
    : `${env.APP_BASE_URL}/`;
  const line = `[Moonshot] NEW FEATURE REQUEST DETECTED: ${title}${
    args.summary ? ` — ${args.summary}` : ""
  } → ${triageUrl}`;

  console.log(`\n${"=".repeat(72)}\n${line}\n${"=".repeat(72)}\n`);

  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(
    path.join(dir, "notifications.jsonl"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      title,
      summary: args.summary ?? null,
      signalId: args.signalId ?? null,
      channelId: args.channelId ?? null,
      triageUrl,
    })}\n`,
  );

  return { notified: true, triageUrl, title };
}

export function hubCustomTools(): Record<string, SDKCustomTool> {
  return {
    ensure_channel_mapped: {
      description: "Ensure Slack channel ID is mapped to a CustomerOrg. Creates org/channel if missing.",
      inputSchema: {
        type: "object",
        properties: {
          channelId: { type: "string" },
          channelName: { type: "string" },
          orgName: { type: "string" },
        },
        required: ["channelId"],
      },
      execute: asToolExecute(ensureChannelMapped),
    },
    upsert_pending_signal: {
      description: "Create or update a PENDING FeatureSignal for triage in the Feature Hub.",
      inputSchema: {
        type: "object",
        properties: {
          channelId: { type: "string" },
          slackTs: { type: "string" },
          threadTs: { type: "string" },
          text: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          confidence: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          slackUserId: { type: "string" },
          slackUserName: { type: "string" },
        },
        required: ["channelId", "slackTs", "text", "title", "summary"],
      },
      execute: asToolExecute(upsertPendingSignal),
    },
    list_similar_requests: {
      description: "List similar existing FeatureRequests by keyword.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
      execute: asToolExecute(listSimilarRequests),
    },
    add_request_note: {
      description: "Add a note to an existing FeatureRequest.",
      inputSchema: {
        type: "object",
        properties: {
          featureRequestId: { type: "string" },
          body: { type: "string" },
        },
        required: ["featureRequestId", "body"],
      },
      execute: asToolExecute(addRequestNote),
    },
    dismiss_noise: {
      description: "Record that the Slack message is not a feature request.",
      inputSchema: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
        required: ["reason"],
      },
      execute: asToolExecute(dismissNoise),
    },
    notify_feature_detected: {
      description:
        "Emit a notification that a new feature request was detected (console + .data/notifications.jsonl). Call after upsert_pending_signal.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          signalId: { type: "string" },
          channelId: { type: "string" },
          summary: { type: "string" },
        },
        required: ["title"],
      },
      execute: asToolExecute(notifyFeatureDetected),
    },
    advance_poll_cursor: {
      description:
        "Advance the Slack poll cursor to the newest processed message timestamp (Slack ts string).",
      inputSchema: {
        type: "object",
        properties: {
          lastTs: { type: "string", description: "Newest Slack message ts processed this cycle" },
        },
        required: ["lastTs"],
      },
      execute: asToolExecute(async (args: { lastTs: string }) => {
        const { savePollState, loadPollState } = await import("@/lib/slack/poll-state");
        const prev = await loadPollState();
        const lastTs = String(args.lastTs);
        if (!prev.lastTs || Number(lastTs) > Number(prev.lastTs)) {
          await savePollState({ ...prev, lastTs, updatedAt: new Date().toISOString() });
        }
        return { lastTs, saved: true };
      }),
    },
  };
}

function customTools(): Record<string, SDKCustomTool> {
  return hubCustomTools();
}

export async function spawnSlackCursorAgent(payload: SlackAgentPayload): Promise<{
  ok: boolean;
  status?: string;
  result?: string;
  error?: string;
  runId?: string;
}> {
  if (!hasCursor()) {
    return { ok: false, error: "CURSOR_API_KEY not configured" };
  }

  const env = getEnv();
  if (!env.CURSOR_AGENT_ENABLED) {
    return { ok: false, error: "CURSOR_AGENT_ENABLED is false" };
  }

  const text = payload.text?.trim() ?? "";
  if (text.length < 8) {
    return { ok: false, error: "message too short" };
  }

  try {
    const runResult = await Agent.prompt(buildPrompt(payload), {
      apiKey: env.CURSOR_API_KEY,
      model: { id: env.CURSOR_AGENT_MODEL },
      local: {
        cwd: process.cwd(),
        customTools: customTools(),
      },
    });

    if (runResult.status === "error") {
      return {
        ok: false,
        status: runResult.status,
        runId: runResult.id,
        error: runResult.error?.message || "agent run failed",
      };
    }

    return {
      ok: true,
      status: runResult.status,
      runId: runResult.id,
      result: runResult.result,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        error: `startup: ${err.message}`,
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown agent error",
    };
  }
}

export function toAgentPayload(message: IncomingSlackMessage): SlackAgentPayload | null {
  if (!message.channel || !message.ts || !message.text) return null;
  if (message.bot_id) return null;
  if (message.subtype && message.subtype !== "file_share") return null;
  return {
    channel: message.channel,
    text: message.text,
    ts: message.ts,
    user: message.user,
    thread_ts: message.thread_ts,
  };
}
