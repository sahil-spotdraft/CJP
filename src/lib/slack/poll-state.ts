import fs from "fs/promises";
import path from "path";

export type PollState = {
  channelId: string;
  lastTs: string | null;
  agentId: string | null;
  updatedAt: string | null;
};

const STATE_PATH = path.join(process.cwd(), ".data", "slack-poll-state.json");

export async function loadPollState(): Promise<PollState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw) as PollState;
  } catch {
    return {
      channelId: process.env.SLACK_POLL_CHANNEL_ID || "C0BMJFWC96J",
      lastTs: null,
      agentId: null,
      updatedAt: null,
    };
  }
}

export async function savePollState(state: PollState): Promise<void> {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function getPollStatePath() {
  return STATE_PATH;
}
