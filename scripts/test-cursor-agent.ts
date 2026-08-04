import { spawnSlackCursorAgent } from "../src/lib/cursor/spawn-agent";

async function main() {
  const text =
    process.argv.slice(2).join(" ") ||
    "Would be great if we could export contract analytics to CSV from the dashboard.";

  const result = await spawnSlackCursorAgent({
    channel: "C0BMJFWC96J",
    text,
    ts: `${Date.now() / 1000}`,
    user: "U05LM9L5R44",
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
