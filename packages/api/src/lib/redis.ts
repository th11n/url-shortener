import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("Missing REDIS_URL");

declare global {
	var __redis: Redis | undefined;
}

export const redis =
	globalThis.__redis ?? new Redis(redisUrl, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalThis.__redis = redis;
