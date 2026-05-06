import type { RouterClient } from "@orpc/server";
import { ORPCError, os } from "@orpc/server";
import { db } from "@url-shortener/db";
import { urls } from "@url-shortener/db/schema/urls";
import { env } from "@url-shortener/env/server";
import { eq, sql } from "drizzle-orm";
import { Client } from "pg";
import { z } from "zod";
import type { Context } from "../../context";
import { urlsChannelForUser } from "../../lib/pg-channel";
import { redis } from "../../lib/redis";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export const appRouter = o.router({
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	createUrl: publicProcedure
		.input(
			z.object({
				originalUrl: z.string().url(),
				slug: z.string().min(3).max(50).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const slug = input.slug ?? Math.random().toString(36).slice(2, 8);

			const isUser = context.session?.user !== undefined;

			const url = await db
				.insert(urls)
				.values({
					shortUrl: slug,
					destinationUrl: input.originalUrl,
					...(isUser && { userId: context.session?.user.id }),
				})
				.returning();

			await redis.set(`url:${slug}`, input.originalUrl, "EX", 60 * 60);

			if (isUser) {
				const userId = context.session!.user.id;
				const channel = urlsChannelForUser(userId);

				const cachePattern = `user:${userId}:urls:*`;
				const keys = await redis.keys(cachePattern);
				if (keys.length > 0) {
					console.log(
						`[createUrl:V3] Invalidating ${keys.length} keys for ${userId}`,
					);
					await redis.del(...keys);
				}

				const payload = JSON.stringify({
					type: "url_created",
					url: url[0],
					at: Date.now(),
				});

				await db.execute(sql`select pg_notify(${channel}, ${payload})`);
				console.log(`[createUrl:V3] Notified channel ${channel}`);
			}

			return {
				url: url[0],
			};
		}),

	getUrl: publicProcedure
		.input(
			z.object({
				slug: z.string().min(3).max(50),
			}),
		)
		.handler(async ({ input }) => {
			const cacheKey = `url:${input.slug}`;

			const cached = await redis.get(cacheKey);
			if (cached) {
				return cached;
			}

			const url = await db
				.select()
				.from(urls)
				.where(eq(urls.shortUrl, input.slug));

			const destination = url[0]?.destinationUrl;

			if (!destination) return null;

			await redis.set(cacheKey, destination, "EX", 60 * 60);

			return destination;
		}),
	listUrls: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(1).max(200).default(100),
					offset: z.number().int().min(0).default(0),
				})
				.default({ limit: 100, offset: 0 }),
		)
		.handler(async ({ context, input }) => {
			const userId = context.session!.user.id;
			const cacheKey = `user:${userId}:urls:limit=${input.limit}:offset=${input.offset}`;

			const cached = await redis.get(cacheKey);

			if (
				cached === "[object Object]" ||
				(cached && cached.startsWith("undefined"))
			) {
				console.warn("[listUrls:V3] Found corrupted cache, deleting...");
				await redis.del(cacheKey);
			} else if (cached) {
				try {
					console.log(`[listUrls:V3] Returning from cache for ${userId}`);
					return JSON.parse(cached) as { urls: (typeof urls.$inferSelect)[] };
				} catch (e) {
					await redis.del(cacheKey);
				}
			}

			console.log(`[listUrls:V3] Fetching from DB for ${userId}`);
			const rows = await db
				.select()
				.from(urls)
				.where(eq(urls.userId, userId))
				.limit(input.limit)
				.offset(input.offset);

			const payload = { urls: rows };

			const stringified = JSON.stringify(payload);
			if (!stringified.includes("[object Object]")) {
				await redis.set(cacheKey, stringified, "EX", 60 * 5);
			}

			return payload;
		}),

	onUrls: protectedProcedure.handler(async function* ({ context, signal }) {
		const userId = context.session!.user.id;
		const channel = urlsChannelForUser(userId);

		console.log(
			`[oRPC:onUrls] Subscription started for user: ${userId} on channel: ${channel}`,
		);

		const pg = new Client({ connectionString: env.DATABASE_URL });

		try {
			await pg.connect();
			console.log(`[oRPC:onUrls] PG Connected for user: ${userId}`);
			await pg.query(`LISTEN "${channel}"`);
			console.log(`[oRPC:onUrls] Listening on channel: "${channel}"`);
		} catch (err) {
			console.error(
				`[oRPC:onUrls] PG Connection/Listen error for user ${userId}:`,
				err,
			);
			return;
		}

		const queue: any[] = [];
		const resolver: (() => void)[] = [];

		queue.push({ type: "subscription_ready" });

		const onNotification = (msg: any) => {
			let payload: any = msg.payload;
			try {
				payload = JSON.parse(msg.payload);
			} catch {}
			console.log(
				`[oRPC:onUrls] PG Notification received for user ${userId}:`,
				payload.type,
			);
			queue.push(payload);
			if (resolver.length > 0) {
				resolver.shift()!();
			}
		};

		pg.on("notification", onNotification);

		signal?.addEventListener("abort", async () => {
			console.log(`[oRPC:onUrls] Connection aborted for user: ${userId}`);
			pg.off("notification", onNotification);
			await pg.query(`UNLISTEN ${channel}`).catch(() => {});
			await pg.end().catch(() => {});
		});

		try {
			while (!signal?.aborted) {
				if (queue.length === 0) {
					await new Promise<void>((res) => resolver.push(res));
				}
				while (queue.length > 0) {
					const item = queue.shift();
					console.log(`[oRPC:onUrls] Yielding data to user ${userId}`);
					yield item;
				}
			}
		} finally {
			console.log(
				`[oRPC:onUrls] Finally block: cleaning up for user ${userId}`,
			);
			pg.off("notification", onNotification);
			await pg.query(`UNLISTEN ${channel}`).catch(() => {});
			await pg.end().catch(() => {});
		}
	}),
});

export default appRouter;
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
