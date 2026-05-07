FROM oven/bun:1.3.3 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
RUN bun run --cwd apps/worker build

FROM oven/bun:1.3.3 AS runner
WORKDIR /app/apps/worker
ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/worker/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/bun.lock /app/bun.lock
COPY --from=deps /app/packages /app/packages
COPY --from=deps /app/apps/worker/package.json ./package.json
COPY --from=builder /app/apps/worker/dist ./dist

CMD ["bun", "dist/index.mjs"]
