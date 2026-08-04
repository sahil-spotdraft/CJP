# Moonshot Feature Hub

Collect feature requests from customer/support Slack channels with AI detection, then triage them in a web hub: **match to an existing request** (aggregating demand across workspaces) or **create a new one**.

## Flow

1. Message lands in a watched Slack channel mapped to a customer org.
2. AI (or heuristic fallback) classifies it as a feature request.
3. Bot replies **in the same thread** with a link to `/triage/{signalId}`.
4. On the triage page you see similar requests (with requesting orgs + notes).
5. **Match** the signal to an existing request, or **Create** a new canonical feature request.

## Stack

- Next.js 15 (App Router) + TypeScript
- Postgres + Prisma
- NextAuth (credentials)
- Slack Events API
- OpenAI-compatible classifier (optional heuristic fallback)

Requires **Node 22.13+** for local development (see `.nvmrc`) — needed for `@cursor/sdk`.

## Cursor agent (Slack → Feature Hub)

When a Slack message hits `/api/slack/events`, Moonshot spawns a **Cursor SDK** local agent with tools that write to Postgres (`ensure_channel_mapped`, `upsert_pending_signal`, etc.).

```env
CURSOR_API_KEY=crsr_...
CURSOR_AGENT_ENABLED=true
CURSOR_AGENT_MODEL=composer-2.5
```

Test without Slack Events:

```bash
npm run agent:test -- "We need Okta SSO for admins"
# or authenticated POST /api/cursor/process-slack
```

### Slack poller (detect + notify)

```bash
nvm use 22
npm run slack:poll:once   # one cycle
npm run slack:poll        # loop every 45s
```

**How Slack is read (in order):**
1. Slack Web API (`SLACK_BOT_TOKEN`) — preferred when token is valid
2. MCP cache file `.data/slack-mcp-cache.json` — use when token is expired (Cursor Slack MCP still works)

Refresh the cache from Cursor (after reading `#cjp_customer_org`):

```bash
npm run slack:mcp-sync -- '{"messages":[{"ts":"...","text":"...","user":"..."}]}'
# or POST /api/slack/mcp-cache with the same JSON
```

On each new feature-like message the poller:
- upserts a pending FeatureSignal
- prints **NEW FEATURE REQUEST DETECTED**
- appends `.data/notifications.jsonl`
- advances `.data/slack-poll-state.json`

## Quick start (Docker)

```bash
cp .env.example .env
# fill SLACK_* and OPENAI_API_KEY as needed

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

Default admin (from seed):

- Email: `admin@moonshot.local`
- Password: `admin123`

## Local development

```bash
# start only Postgres (host port 5433 to avoid clashing with local Postgres)
docker compose up db -d

cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

> Local Postgres is exposed on **5433**. Inside Docker Compose, the `web` service still connects to `db:5432`.


## Slack setup

1. Create an app from [`slack-manifest.json`](./slack-manifest.json).
2. Set Event Subscriptions URL to `https://<your-host>/api/slack/events`.
3. Install the app to your workspace and copy the bot token + signing secret into `.env`.
4. In the hub **Settings** / **Orgs**, map Slack channel IDs → customer orgs.

For local Slack testing, expose the app with a tunnel (ngrok, Cloudflare Tunnel, etc.) and point the Events URL at `/api/slack/events`.

## Useful scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed admin + sample data |
| `npm run db:studio` | Prisma Studio |

## Key routes

| Path | Description |
|---|---|
| `/` | Pending signal inbox |
| `/triage/[signalId]` | Match / create / dismiss |
| `/requests` | Canonical feature requests |
| `/orgs` | Customer org + channel mapping |
| `/roadmap` | Roadmap board |
| `/settings` | Classifier + channel watches |
| `/api/slack/events` | Slack Events webhook |
