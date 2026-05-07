# URL Shortener

Monorepo with 4 services:

- `web` (Next.js, port `3001`)
- `server` (API, port `3000`)
- `analytics` (tracking API, port `3002`)
- `worker` (RabbitMQ consumer)

Shared code is in `packages/*`.

## Stack

Bun, Turborepo, Next.js, Hono, Drizzle + Postgres, Redis, RabbitMQ, Better Auth.

## Local run

1. Install deps

```bash
bun install
```

2. Start infra

```bash
bun db:start
```

3. Create env files from:

- `apps/web/.env.example`
- `apps/server/.env.example`
- `apps/analytics/.env.example`

4. Push schema

```bash
bun db:push
```

5. Start all apps

```bash
bun dev
```

## Useful commands

```bash
bun build
bun check-types
bun check

bun db:generate
bun db:migrate
bun db:studio
bun db:stop
bun db:down
```

## Docker / CI

GitHub Actions builds 4 images (web/server/analytics/worker) and pushes them to GHCR on push to `master`.

Image names:

- `ghcr.io/<owner>/<repo>-web`
- `ghcr.io/<owner>/<repo>-server`
- `ghcr.io/<owner>/<repo>-analytics`
- `ghcr.io/<owner>/<repo>-worker`

Tags: `latest`, branch/tag, sha.

Workflow file: `.github/workflows/docker-image.yml`

## Deploy with docker-compose

Root `docker-compose.yml` pulls images from GHCR (no local build).

Defaults in compose:

- `GHCR_OWNER=th11n`
- `GHCR_REPO=url-shortener`
- `IMAGE_TAG=latest`

Run:

```bash
docker compose pull
docker compose up -d
```

## Repo layout

```text
apps/
  web/
  server/
  analytics/
  worker/
packages/
  api/
  auth/
  db/
  env/
  ui/
  config/
```
