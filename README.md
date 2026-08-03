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

Requires **Node 20+** for local development (see `.nvmrc`).

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
