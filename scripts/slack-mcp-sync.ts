/**
 * Writes .data/slack-mcp-cache.json for the poller when Web API tokens are expired.
 *
 * Usage from a Cursor agent session (or any process that can read Slack):
 *   npx tsx scripts/slack-mcp-sync.ts --stdin < messages.json
 *
 * Or with inline JSON:
 *   npx tsx scripts/slack-mcp-sync.ts '{"messages":[...]}'
 *
 * The poller (`npm run slack:poll`) reads this cache if SLACK_BOT_TOKEN cannot
 * call conversations.history.
 */
import fs from "fs/promises";
import path from "path";

type Msg = {
  ts: string;
  text: string;
  user?: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
};

async function main() {
  let payload: string;
  if (process.argv[2] && process.argv[2] !== "--stdin") {
    payload = process.argv.slice(2).join(" ");
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    payload = Buffer.concat(chunks).toString("utf8");
  }

  if (!payload.trim()) {
    console.error("Provide JSON: { messages: [{ ts, text, user? }] }");
    process.exit(1);
  }

  const parsed = JSON.parse(payload) as { messages?: Msg[] } | Msg[];
  const messages = Array.isArray(parsed) ? parsed : parsed.messages || [];

  const out = {
    fetchedAt: new Date().toISOString(),
    channelId: process.env.SLACK_POLL_CHANNEL_ID || "C0BMJFWC96J",
    messages,
  };

  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "slack-mcp-cache.json");
  await fs.writeFile(file, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${messages.length} messages to ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
