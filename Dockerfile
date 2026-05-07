FROM oven/bun:1.3.3 AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile


FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DISABLE_TURBOPACK=1

ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000/rpc/v1
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_ANALYTICS_URL=http://localhost:3002

ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_ANALYTICS_URL=${NEXT_PUBLIC_ANALYTICS_URL}

COPY --from=deps /app ./

WORKDIR /app/apps/web
RUN node ../../node_modules/next/dist/bin/next build


FROM oven/bun:1.3.3 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=deps /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=deps /app/apps/web/postcss.config.mjs ./apps/web/postcss.config.mjs

EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/web", "start"]
