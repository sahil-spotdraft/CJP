import OpenAI from "openai";
import { getEnv, hasOpenAI } from "@/lib/env";

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI()) return null;
  const env = getEnv();
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });
}
