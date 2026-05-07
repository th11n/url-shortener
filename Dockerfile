FROM oven/bun:1.3.3 AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile


FROM oven/bun:1.3.3 AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000/rpc/v1
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_ANALYTICS_URL=http://localhost:3002

ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_ANALYTICS_URL=${NEXT_PUBLIC_ANALYTICS_URL}

COPY --from=deps /app ./
RUN bun run --cwd apps/web build


FROM oven/bun:1.3.3 AS runner
WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/bun.lock /app/bun.lock
COPY --from=deps /app/apps/web/package.json ./package.json

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=deps /app/apps/web/next.config.ts ./next.config.ts
COPY --from=deps /app/apps/web/postcss.config.mjs ./postcss.config.mjs

EXPOSE 3001

CMD ["bun", "node_modules/next/dist/bin/next", "start", "--port", "3001"]
