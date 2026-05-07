FROM oven/bun:1.3.3 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
RUN bun run --cwd apps/server build

FROM oven/bun:1.3.3 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 3000
CMD ["bun", "--port", "3000", "run", "apps/server/dist/index.mjs"]
