# ⚡ TrimLink - Modern URL Shortener

A powerful, scalable, and ultra-fast URL shortener built with a monorepo architecture. This project focuses on high performance, security, and real-time analytics.

## 🚀 Key Features

- **URL Shortening**: Create short, shareable links in an instant.
- **Custom Slugs**: Support for user-defined link identifiers.
- **Real-time Analytics**: Track clicks with detailed info on devices, browsers, and geographic location.
- **Queue System (RabbitMQ)**: Background processing of analytics ensures lightning-fast redirects.
- **Caching (Redis)**: Redirect lookups are cached to reduce database load to near zero.
- **Full Auth**: Secure sign-in and registration powered by `better-auth`.
- **End-to-End Type Safety**: Shared TypeScript types across the entire stack (from DB to Frontend) via `oRPC`.

## 🏗️ System Architecture

The system is split into micro-services and shared packages using a Monorepo structure:

- **`apps/web`**: Next.js 16 frontend with a modern UI (Shadcn/UI, GSAP Animations, Confetti).
- **`apps/server`**: Main API Gateway built with Hono, handling business logic and oRPC endpoints.
- **`apps/analytics`**: Isolated analytics service (Hono) that collects data and dispatches events to RabbitMQ.
- **`packages/db`**: Database layer using Drizzle ORM and PostgreSQL.
- **`packages/api`**: Shared oRPC router definitions and business logic.
- **`packages/auth`**: Shared Better-Auth configuration used across all services.

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Frontend**: Next.js 16, TailwindCSS, Framer Motion, TanStack Query/Form
- **Backend**: Hono, oRPC
- **Database**: PostgreSQL, Drizzle ORM
- **Infrastructure**: Docker, RabbitMQ, Redis
- **Tooling**: Turborepo, Biome, Husky

## 🏁 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd url-shortener
bun install
```

### 2. Infrastructure (Docker)
Spin up the required services (Postgres, Redis, RabbitMQ):
```bash
cd packages/db
docker-compose up -d
```

### 3. Environment Variables
Copy `.env.example` (if available) or create `.env` files in the respective `apps/*` directories with your database, Redis, and RabbitMQ credentials.

### 4. Database Migrations
```bash
bun db:push
```

### 5. Run the Project
```bash
bun dev
```

## 📈 Monitoring & Tools
- **Drizzle Studio**: `bun db:studio` (database browser)
- **RabbitMQ Management**: `http://localhost:15672` (User: `admin`, Pass: `admin`)
- **API Docs**: `http://localhost:3000/api-reference/v1` (OpenAPI/Swagger)

---

Built with a passion for high-performance code. ✨
