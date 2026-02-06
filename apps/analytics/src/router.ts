import { ORPCError, os } from "@orpc/server";
import type { Context } from "@url-shortener/api/context";
import { db } from "@url-shortener/db";
import { linkClicks } from "@url-shortener/db/schema/analytics";
import { urls } from "@url-shortener/db/schema/urls";
import { env } from "@url-shortener/env/server";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { Client } from "pg";
import { z } from "zod";

export const o = os.$context<Context>();

/**
 * Middleware autoryzacji
 */
export const protectedProcedure = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const analyticsRouter = o.router({
	getLinkAnalytics: o
		.use(protectedProcedure)
		.input(
			z.object({
				id: z.string(),
				days: z.number().int().min(1).max(365).default(30),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const rows = await db
				.select()
				.from(urls)
				.where(or(eq(urls.id, input.id), eq(urls.shortUrl, input.id)));

			const link = rows[0];
			if (!link)
				throw new ORPCError("NOT_FOUND", { message: "Link not found" });
			if (link.userId !== userId)
				throw new ORPCError("FORBIDDEN", { message: "Unauthorized" });

			const resolvedId = link.id;
			const now = new Date();
			const since = new Date();
			since.setDate(since.getDate() - input.days);

			const hoursSince = Math.max(
				1,
				(now.getTime() - new Date(link.createdAt).getTime()) / (1000 * 60 * 60),
			);
			const hoursInPeriod = input.days * 24;
			const effectiveHours = Math.min(hoursSince, hoursInPeriod);

			// 1. Core Metrics
			const totalClicks = await db
				.select({ value: sql<number>`count(*)` })
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.then((r) => Number(r[0]?.value ?? 0));

			const uniqueVisitors = await db
				.select({ value: sql<number>`count(distinct ${linkClicks.ip})` })
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.then((r) => Number(r[0]?.value ?? 0));

			// calculated avg hourly based on real link age or selected period
			const avgHourly = totalClicks / effectiveHours;

			// 2. Activity Trend (Timeseries) - Aggregate from linkClicks for better accuracy on small datasets
			const timeseriesRows = await db
				.select({
					day: sql<string>`date_trunc('day', ${linkClicks.ts})`,
					clicks: sql<number>`count(*)`,
					visitors: sql<number>`count(distinct ${linkClicks.ip})`,
				})
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.groupBy(sql`1`)
				.orderBy(sql`1`);

			const timeseries = timeseriesRows.map((row) => ({
				day: new Date(row.day).toISOString(),
				clicks: Number(row.clicks) || 0,
				visitors: Number(row.visitors) || 0,
			}));

			// 3. Devices
			const devicesRows = await db
				.select({ device: linkClicks.device, count: sql<number>`count(*)` })
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.groupBy(linkClicks.device);

			const devices = devicesRows.map((d) => ({
				device: d.device,
				count: Number(d.count),
			}));

			// 4. Browsers
			const browsersRows = await db
				.select({ browser: linkClicks.browser, count: sql<number>`count(*)` })
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.groupBy(linkClicks.browser)
				.orderBy(desc(sql`count(*)`))
				.limit(10);

			const browsers = browsersRows.map((b) => ({
				browser: b.browser || "Unknown",
				count: Number(b.count),
			}));

			// 5. Countries
			const countriesRows = await db
				.select({ country: linkClicks.country, count: sql<number>`count(*)` })
				.from(linkClicks)
				.where(
					and(eq(linkClicks.linkId, resolvedId), gte(linkClicks.ts, since)),
				)
				.groupBy(linkClicks.country)
				.orderBy(desc(sql`count(*)`))
				.limit(10);

			const topCountries = countriesRows.map((c) => ({
				country: c.country || "Unknown",
				count: Number(c.count),
			}));

			// 6. Recent Clicks
			const clicks = await db
				.select()
				.from(linkClicks)
				.where(eq(linkClicks.linkId, resolvedId))
				.orderBy(desc(linkClicks.ts))
				.limit(50);

			return {
				link,
				metrics: {
					totalClicks,
					uniqueVisitors,
					avgHourly, // Passed specifically to fix dashboard display
				},
				clicks,
				timeseries,
				topCountries,
				devices,
				browsers,
			};
		}),

	onLinkAnalytics: o
		.use(protectedProcedure)
		.input(z.object({ id: z.string() }))
		.handler(async function* ({ input, context, signal }) {
			const userId = context.session.user.id;

			const rows = await db
				.select()
				.from(urls)
				.where(or(eq(urls.id, input.id), eq(urls.shortUrl, input.id)));

			const link = rows[0];
			if (!link || link.userId !== userId) throw new ORPCError("NOT_FOUND");

			const channel = `la${link.id.replace(/-/g, "")}`;
			const pg = new Client({ connectionString: env.DATABASE_URL });
			await pg.connect();
			await pg.query(`LISTEN ${channel}`);

			type UpdateEvent =
				| { type: "click_added"; at: number }
				| { type: "subscription_ready" }
				| { type: "heartbeat" };
			const queue: UpdateEvent[] = [];
			let resolver: (() => void) | null = null;

			const onNotification = (msg: { channel: string }) => {
				if (msg.channel === channel) {
					queue.push({ type: "click_added", at: Date.now() });
					if (resolver) {
						resolver();
						resolver = null;
					}
				}
			};

			pg.on("notification", onNotification);

			signal?.addEventListener("abort", async () => {
				pg.off("notification", onNotification);
				await pg.query("UNLISTEN *").catch(() => {});
				await pg.end().catch(() => {});
				if (resolver) resolver();
			});

			yield { type: "subscription_ready" };

			try {
				while (!signal?.aborted) {
					if (queue.length === 0) {
						await new Promise<void>((res) => {
							resolver = res;
							setTimeout(() => {
								if (resolver === res) {
									resolver = null;
									res();
								}
							}, 15000);
						});
						if (queue.length === 0 && !signal?.aborted) {
							yield { type: "heartbeat" };
							continue;
						}
					}
					if (signal?.aborted) break;
					while (queue.length > 0) yield queue.shift();
				}
			} finally {
				pg.off("notification", onNotification);
				await pg.end().catch(() => {});
			}
		}),
});

export type AnalyticsRouter = typeof analyticsRouter;
