import { runSlackPollCycle } from "../src/lib/slack/poller";
import { getEnv } from "../src/lib/env";
import { getPollStatePath, loadPollState } from "../src/lib/slack/poll-state";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const once = process.argv.includes("--once");
  const env = getEnv();
  const interval = Number(process.env.SLACK_POLL_INTERVAL_MS || 45000);

  console.log(`[poller] state file: ${getPollStatePath()}`);
  console.log(`[poller] channel: ${env.SLACK_POLL_CHANNEL_ID} (#${env.SLACK_POLL_CHANNEL_NAME})`);
  console.log(`[poller] mode: ${once ? "once" : `loop every ${interval}ms`}`);
  console.log(`[poller] initial state:`, await loadPollState());

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const started = Date.now();
    const result = await runSlackPollCycle();
    console.log(`[poller] cycle done in ${Date.now() - started}ms`, result);

    if (once) {
      process.exit(result.ok ? 0 : 1);
    }

    await sleep(interval);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
