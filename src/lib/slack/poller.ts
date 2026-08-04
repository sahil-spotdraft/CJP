import { Agent, CursorAgentError } from "@cursor/sdk";
import { hubCustomTools } from "@/lib/cursor/spawn-agent";
import { getEnv, hasCursor } from "@/lib/env";
import { loadPollState, savePollState } from "@/lib/slack/poll-state";
import { classifyMessage } from "@/lib/ai/classifier";
import { FeatureSignalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WebClient } from "@slack/web-api";
import fs from "fs/promises";
import path from "path";

export type SlackPollMessage = {
  ts: string;
  text: string;
  user?: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
};

function isNoise(msg: SlackPollMessage): boolean {
  if (msg.bot_id) return true;
  if (msg.subtype && msg.subtype !== "file_share") return true;
  const text = (msg.text || "").trim();
  if (text.length < 8) return true;
  if (/has joined the channel/i.test(text)) return true;
  return false;
}

async function notify(title: string, signalId: string, summary: string) {
  const env = getEnv();
  const triageUrl = `${env.APP_BASE_URL}/triage/${signalId}`;
  const line = `[Moonshot] NEW FEATURE REQUEST DETECTED: ${title} — ${summary} → ${triageUrl}`;
  console.log(`\n${"=".repeat(72)}\n${line}\n${"=".repeat(72)}\n`);
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(
    path.join(dir, "notifications.jsonl"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      title,
      summary,
      signalId,
      triageUrl,
    })}\n`,
  );
  return triageUrl;
}

async function ensureMapped(channelId: string, channelName: string) {
  let channel = await prisma.slackChannel.findUnique({
    where: { channelId },
    include: { org: true },
  });
  if (channel) return channel;

  const org = await prisma.customerOrg.upsert({
    where: { slug: "cjp-customer-org" },
    update: {},
    create: { name: "CJP Customer Org", slug: "cjp-customer-org" },
  });

  channel = await prisma.slackChannel.create({
    data: {
      channelId,
      name: channelName,
      enabled: true,
      orgId: org.id,
    },
    include: { org: true },
  });
  return channel;
}

export async function processPolledMessages(params: {
  channelId: string;
  channelName: string;
  messages: SlackPollMessage[];
  lastTs: string | null;
}): Promise<{
  processed: number;
  features: number;
  newestTs: string | null;
  notifications: string[];
}> {
  const sorted = [...params.messages].sort(
    (a, b) => Number(a.ts) - Number(b.ts),
  );

  let newestTs = params.lastTs;
  let processed = 0;
  let features = 0;
  const notifications: string[] = [];

  const channel = await ensureMapped(params.channelId, params.channelName);

  for (const msg of sorted) {
    if (params.lastTs && Number(msg.ts) <= Number(params.lastTs)) continue;
    newestTs = !newestTs || Number(msg.ts) > Number(newestTs) ? msg.ts : newestTs;

    if (isNoise(msg)) continue;
    processed += 1;

    const classification = await classifyMessage(msg.text);
    const { result } = classification;
    const threshold = getEnv().CLASSIFIER_CONFIDENCE_THRESHOLD;

    if (!result.is_feature_request || result.confidence < threshold) {
      console.log(
        `[poller] skip non-FR ts=${msg.ts} conf=${result.confidence}: ${msg.text.slice(0, 60)}`,
      );
      continue;
    }

    const signal = await prisma.featureSignal.upsert({
      where: {
        channelId_slackTs: { channelId: channel.id, slackTs: msg.ts },
      },
      create: {
        status: FeatureSignalStatus.PENDING,
        rawText: msg.text,
        aiTitle: result.title.slice(0, 120),
        aiSummary: result.summary.slice(0, 500),
        aiConfidence: result.confidence,
        aiTags: result.tags,
        slackUserId: msg.user ?? null,
        slackTs: msg.ts,
        threadTs: msg.thread_ts ?? msg.ts,
        orgId: channel.orgId,
        channelId: channel.id,
      },
      update: {
        status: FeatureSignalStatus.PENDING,
        rawText: msg.text,
        aiTitle: result.title.slice(0, 120),
        aiSummary: result.summary.slice(0, 500),
        aiConfidence: result.confidence,
        aiTags: result.tags,
      },
    });

    features += 1;
    const url = await notify(result.title, signal.id, result.summary);
    notifications.push(url);
  }

  return { processed, features, newestTs, notifications };
}

async function fetchViaWebApi(channelId: string, oldest?: string | null) {
  const token = getEnv().SLACK_BOT_TOKEN;
  if (!token) return { ok: false as const, error: "no_token", messages: [] as SlackPollMessage[] };

  const client = new WebClient(token);
  try {
    const res = await client.conversations.history({
      channel: channelId,
      limit: 20,
      oldest: oldest || undefined,
      inclusive: false,
    });
    if (!res.ok) {
      return {
        ok: false as const,
        error: String((res as { error?: string }).error || "slack_error"),
        messages: [] as SlackPollMessage[],
      };
    }
    const messages: SlackPollMessage[] = (res.messages || []).map((m) => ({
      ts: String(m.ts),
      text: String(m.text || ""),
      user: m.user,
      thread_ts: m.thread_ts,
      subtype: m.subtype,
      bot_id: m.bot_id,
    }));
    return { ok: true as const, messages };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "web_api_failed",
      messages: [] as SlackPollMessage[],
    };
  }
}

async function fetchViaMcpCache(): Promise<SlackPollMessage[] | null> {
  const cachePath = path.join(process.cwd(), ".data", "slack-mcp-cache.json");
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as {
      fetchedAt?: string;
      messages?: SlackPollMessage[];
    };
    if (!parsed.fetchedAt || !parsed.messages) return null;
    const ageMs = Date.now() - new Date(parsed.fetchedAt).getTime();
    // Accept cache up to 10 minutes for bootstrap; poll loop refreshes via sync script
    if (ageMs > 10 * 60 * 1000) return null;
    return parsed.messages;
  } catch {
    return null;
  }
}

async function fetchViaCloudAgent(channelId: string, lastTs: string | null) {
  if (!hasCursor()) return { ok: false as const, error: "no_cursor_key", messages: [] as SlackPollMessage[] };
  const env = getEnv();

  const prompt = `Read Slack channel ${channelId} using Slack MCP (slack_read_channel or equivalent).
Return ONLY a JSON array of messages (newest first is fine) with fields:
ts, text, user, thread_ts, subtype, bot_id.
${lastTs ? `Only include messages with ts > ${lastTs}.` : "Include up to 10 recent messages."}
No markdown fences. JSON only.`;

  try {
    const result = await Agent.prompt(prompt, {
      apiKey: env.CURSOR_API_KEY,
      model: { id: env.CURSOR_AGENT_MODEL },
      cloud: {
        // no-repo cloud agent — empty workspace, MCP from dashboard + inline
        envVars: {},
      },
      mcpServers: {
        slack: {
          type: "http",
          url: env.SLACK_MCP_URL,
          auth: { CLIENT_ID: env.SLACK_MCP_CLIENT_ID },
        },
      },
    });

    if (result.status !== "finished" || !result.result) {
      return {
        ok: false as const,
        error: result.error?.message || "cloud_agent_failed",
        messages: [] as SlackPollMessage[],
      };
    }

    const text = result.result.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end < 0) {
      return { ok: false as const, error: "no_json_in_agent_result", messages: [] as SlackPollMessage[] };
    }
    const messages = JSON.parse(text.slice(start, end + 1)) as SlackPollMessage[];
    return { ok: true as const, messages };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "cloud_fetch_failed",
      messages: [] as SlackPollMessage[],
    };
  }
}

export async function runSlackPollCycle(): Promise<{
  ok: boolean;
  source?: string;
  result?: string;
  error?: string;
  processed?: number;
  features?: number;
}> {
  const env = getEnv();
  const state = await loadPollState();
  const channelId = env.SLACK_POLL_CHANNEL_ID || state.channelId || "C0BMJFWC96J";
  const channelName = env.SLACK_POLL_CHANNEL_NAME || "cjp_customer_org";

  console.log(
    `[poller] cycle start channel=${channelId} lastTs=${state.lastTs ?? "(none)"}`,
  );

  // 1) Web API
  let source = "web_api";
  let fetched = await fetchViaWebApi(channelId, state.lastTs);

  // 2) Fresh MCP cache (written by `npm run slack:mcp-sync` or Cursor sync)
  if (!fetched.ok) {
    console.warn(`[poller] web_api failed: ${fetched.error}`);
    const cached = await fetchViaMcpCache();
    if (cached) {
      source = "mcp_cache";
      fetched = { ok: true, messages: cached };
      console.log(`[poller] using mcp cache (${cached.length} messages)`);
    }
  }

  // 3) Cloud agent + Slack MCP
  if (!fetched.ok) {
    console.warn(`[poller] trying cloud agent Slack MCP…`);
    source = "cloud_mcp";
    fetched = await fetchViaCloudAgent(channelId, state.lastTs);
  }

  if (!fetched.ok) {
    return {
      ok: false,
      error: `Unable to read Slack (${fetched.error}). Run: npm run slack:mcp-sync   OR refresh SLACK_BOT_TOKEN`,
      source,
    };
  }

  const outcome = await processPolledMessages({
    channelId,
    channelName,
    messages: fetched.messages,
    lastTs: state.lastTs,
  });

  await savePollState({
    channelId,
    lastTs: outcome.newestTs ?? state.lastTs,
    agentId: state.agentId,
    updatedAt: new Date().toISOString(),
  });

  const summary = `source=${source} processed=${outcome.processed} features=${outcome.features} cursor=${outcome.newestTs ?? state.lastTs}`;
  console.log(`[poller] ${summary}`);
  if (outcome.notifications.length) {
    console.log(`[poller] notifications:`, outcome.notifications);
  }

  return {
    ok: true,
    source,
    result: summary,
    processed: outcome.processed,
    features: outcome.features,
  };
}

/** Optional: keep a durable local agent warm (not required for poll+notify). */
export async function warmDurableAgent(): Promise<string | null> {
  if (!hasCursor()) return null;
  const env = getEnv();
  const state = await loadPollState();
  try {
    if (state.agentId) {
      const agent = await Agent.resume(state.agentId, {
        apiKey: env.CURSOR_API_KEY,
        model: { id: env.CURSOR_AGENT_MODEL },
        local: { cwd: process.cwd(), customTools: hubCustomTools() },
      });
      return agent.agentId;
    }
    const agent = await Agent.create({
      apiKey: env.CURSOR_API_KEY,
      model: { id: env.CURSOR_AGENT_MODEL },
      name: "moonshot-slack-poller",
      local: { cwd: process.cwd(), customTools: hubCustomTools() },
    });
    await savePollState({
      ...(await loadPollState()),
      agentId: agent.agentId,
      updatedAt: new Date().toISOString(),
    });
    return agent.agentId;
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.warn(`[poller] durable agent warm failed: ${err.message}`);
    }
    return null;
  }
}
