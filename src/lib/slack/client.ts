import { WebClient } from "@slack/web-api";
import { getEnv, hasSlack } from "@/lib/env";

let client: WebClient | null = null;

export function getSlackClient(): WebClient | null {
  if (!hasSlack()) return null;
  if (!client) {
    client = new WebClient(getEnv().SLACK_BOT_TOKEN);
  }
  return client;
}

export async function postThreadReply(params: {
  channel: string;
  threadTs: string;
  text: string;
}): Promise<string | null> {
  const slack = getSlackClient();
  if (!slack) return null;

  const result = await slack.chat.postMessage({
    channel: params.channel,
    thread_ts: params.threadTs,
    text: params.text,
    unfurl_links: false,
    unfurl_media: false,
  });

  return typeof result.ts === "string" ? result.ts : null;
}

export async function updateMessage(params: {
  channel: string;
  ts: string;
  text: string;
}): Promise<void> {
  const slack = getSlackClient();
  if (!slack) return;

  await slack.chat.update({
    channel: params.channel,
    ts: params.ts,
    text: params.text,
  });
}

export async function getPermalink(channel: string, messageTs: string): Promise<string | null> {
  const slack = getSlackClient();
  if (!slack) return null;

  try {
    const result = await slack.chat.getPermalink({ channel, message_ts: messageTs });
    return result.permalink ?? null;
  } catch {
    return null;
  }
}
