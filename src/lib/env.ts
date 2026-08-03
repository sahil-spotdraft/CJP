import { z } from "zod";

const envSchema = z.object({
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().default("dev-secret-change-in-production-moonshot-2026"),
  DATABASE_URL: z.string().default("postgresql://moonshot:moonshot@localhost:5433/moonshot?schema=public"),
  SLACK_BOT_TOKEN: z.string().optional().default(""),
  SLACK_REFRESH_TOKEN: z.string().optional().default(""),
  SLACK_SIGNING_SECRET: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  CLASSIFIER_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});


export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}

export function hasOpenAI(): boolean {
  return Boolean(getEnv().OPENAI_API_KEY);
}

export function hasSlack(): boolean {
  return Boolean(getEnv().SLACK_BOT_TOKEN);
}

export function hasSlackSigningSecret(): boolean {
  return Boolean(getEnv().SLACK_SIGNING_SECRET);
}
