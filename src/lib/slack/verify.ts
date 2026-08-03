import crypto from "crypto";
import { getEnv } from "@/lib/env";

const MAX_CLOCK_SKEW_SEC = 60 * 5;

export function verifySlackSignature(params: {
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
}): boolean {
  const secret = getEnv().SLACK_SIGNING_SECRET;
  if (!secret) return false;
  if (!params.signature || !params.timestamp) return false;

  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_CLOCK_SKEW_SEC) return false;

  const base = `v0:${params.timestamp}:${params.rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(base).digest("hex");
  const expected = `v0=${digest}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
