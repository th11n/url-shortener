import { db } from "@url-shortener/db";
import { linkClicks, linkDailyStats } from "@url-shortener/db/schema/analytics";
import { urls } from "@url-shortener/db/schema/urls";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Context, Hono } from "hono";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";
import { publishJson } from "../rabbit";

type Device = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

type AnalyticsSummary = {
	metrics: {
		totalClicks: number;
		uniqueVisitors: number;
		botClicks: number;
		botShare: number; // 0..1
	};
	timeseries: Array<{
		day: string; // ISO date
		clicks: number;
		visitors: number;
	}>;
	topCountries: Array<{
		country: string | null;
		count: number;
	}>;
	links: Array<{
		id: string;
		shortUrl: string;
		destinationUrl: string;
		createdAt: string;
		totalClicks: number;
		uniqueVisitors: number;
	}>;
};

type ClickEvent = {
	slug: string;
	ts: string;

	ip: string | null;

	country: string | null;
	region: string | null;
	city: string | null;

	referrer: string | null;
	userAgent: string | null;

	device: Device;
	browser: string | null;
	os: string | null;

	isBot: boolean;

	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
};

function getClientIp(c: Context) {
	const cf = c.req.header("cf-connecting-ip");
	if (cf) return cf.trim();

	const xff = c.req.header("x-forwarded-for");
	if (xff) return xff.split(",")[0]!.trim();

	const real = c.req.header("x-real-ip");
	if (real) return real.trim();

	return null;
}

function parseUa(uaRaw?: string): {
	userAgent: string | null;
	device: Device;
	browser: string | null;
	os: string | null;
	isBot: boolean;
} {
	const ua = uaRaw ?? "";
	const bot = isbot(ua);

	const parsed = new UAParser(ua).getResult();
	const deviceType = parsed.device.type;

	let device: Device = "unknown";
	if (bot) device = "bot";
	else if (deviceType === "mobile") device = "mobile";
	else if (deviceType === "tablet") device = "tablet";
	else device = "desktop";

	return {
		userAgent: ua || null,
		device,
		browser: parsed.browser.name ?? null,
		os: parsed.os.name ?? null,
		isBot: bot,
	};
}

export function registerAnalyticsRoutes(app: Hono) {
	const EXCHANGE = process.env.RABBITMQ_CLICK_EXCHANGE ?? "clicks";
	const ROUTING_KEY = "click";

	app.post("/track/:slug", async (c) => {
		const slug = c.req.param("slug");

		const ip = getClientIp(c);
		const ua = parseUa(c.req.header("user-agent"));
		const referrer = c.req.header("referer") ?? null;

		const reqUrl = new URL(c.req.url);
		const utmSource = reqUrl.searchParams.get("utm_source");
		const utmMedium = reqUrl.searchParams.get("utm_medium");
		const utmCampaign = reqUrl.searchParams.get("utm_campaign");

		const event: ClickEvent = {
			slug,
			ts: new Date().toISOString(),

			ip,

			country: null,
			region: null,
			city: null,

			referrer,
			userAgent: ua.userAgent,

			device: ua.device,
			browser: ua.browser,
			os: ua.os,

			isBot: ua.isBot,

			utmSource,
			utmMedium,
			utmCampaign,
		};

		publishJson({
			exchange: EXCHANGE,
			routingKey: ROUTING_KEY,
			payload: event,
		}).catch(() => {});

		console.log("[analytics] publish", {
			exchange: EXCHANGE,
			routingKey: ROUTING_KEY,
		});

		return c.body(null, 204);
	});
}

export function registerAnalyticsSummaryRoutes(app: Hono) {
	app.get("/analytics/summary", async (c) => {
		// TODO: podepnij swoje auth/session
		// np. const session = c.get("session"); const userId = session.user.id;
		const userId = c.req.header("x-user-id");
		if (!userId) return c.json({ error: "Unauthorized" }, 401);

		const days = Number(c.req.query("days") ?? 30);
		const since = new Date();
		since.setDate(since.getDate() - Math.max(1, Math.min(days, 365)));

		// 1) Metryki globalne (od "since")
		// total clicks
		const totalClicksRow = await db
			.select({ value: sql<number>`count(*)` })
			.from(linkClicks)
			.innerJoin(urls, eq(linkClicks.linkId, urls.id))
			.where(and(eq(urls.userId, userId), gte(linkClicks.ts, since)))
			.then((r) => r[0]?.value ?? 0);

		// unique visitors (tu przykładowo po ip; jak masz visitorId/cookie to użyj tego)
		const uniqueVisitorsRow = await db
			.select({ value: sql<number>`count(distinct ${linkClicks.ip})` })
			.from(linkClicks)
			.innerJoin(urls, eq(linkClicks.linkId, urls.id))
			.where(and(eq(urls.userId, userId), gte(linkClicks.ts, since)))
			.then((r) => r[0]?.value ?? 0);

		// bot clicks
		const botClicksRow = await db
			.select({ value: sql<number>`count(*)` })
			.from(linkClicks)
			.innerJoin(urls, eq(linkClicks.linkId, urls.id))
			.where(
				and(
					eq(urls.userId, userId),
					gte(linkClicks.ts, since),
					eq(linkClicks.isBot, true),
				),
			)
			.then((r) => r[0]?.value ?? 0);

		const totalClicks = Number(totalClicksRow) || 0;
		const uniqueVisitors = Number(uniqueVisitorsRow) || 0;
		const botClicks = Number(botClicksRow) || 0;

		// 2) Timeseries (bazuj na linkDailyStats, bo to już agregacja)
		// UWAGA: jeśli linkDailyStats ma tylko dzienne agregaty dla wszystkich dni, to filtruj po day >= sinceDate
		const sinceDateOnly = new Date(since);
		sinceDateOnly.setHours(0, 0, 0, 0);

		const timeseries = await db
			.select({
				day: linkDailyStats.day,
				clicks: sql<number>`sum(${linkDailyStats.totalClicks})`,
				visitors: sql<number>`sum(${linkDailyStats.uniqueVisitors})`,
			})
			.from(linkDailyStats)
			.innerJoin(urls, eq(linkDailyStats.linkId, urls.id))
			.where(
				and(eq(urls.userId, userId), gte(linkDailyStats.day, sinceDateOnly)),
			)
			.groupBy(linkDailyStats.day)
			.orderBy(desc(linkDailyStats.day))
			.limit(Math.max(1, Math.min(days, 365)));

		// 3) Top kraje (ostatnie "since")
		const topCountries = await db
			.select({
				country: linkClicks.country,
				count: sql<number>`count(*)`,
			})
			.from(linkClicks)
			.innerJoin(urls, eq(linkClicks.linkId, urls.id))
			.where(and(eq(urls.userId, userId), gte(linkClicks.ts, since)))
			.groupBy(linkClicks.country)
			.orderBy(desc(sql`count(*)`))
			.limit(5);

		// 4) Lista linków + ich staty (clicks/visitors od since)
		const links = await db
			.select({
				id: urls.id,
				shortUrl: urls.shortUrl,
				destinationUrl: urls.destinationUrl,
				createdAt: urls.createdAt,

				totalClicks: sql<number>`coalesce(count(${linkClicks.id}), 0)`,
				uniqueVisitors: sql<number>`coalesce(count(distinct ${linkClicks.ip}), 0)`,
			})
			.from(urls)
			.leftJoin(
				linkClicks,
				and(eq(linkClicks.linkId, urls.id), gte(linkClicks.ts, since)),
			)
			.where(eq(urls.userId, userId))
			.groupBy(urls.id)
			.orderBy(desc(urls.createdAt))
			.limit(50);

		const payload: AnalyticsSummary = {
			metrics: {
				totalClicks,
				uniqueVisitors,
				botClicks,
				botShare: totalClicks > 0 ? botClicks / totalClicks : 0,
			},
			timeseries: timeseries
				// opcjonalnie: odwróć pod wykres (rosnąco)
				.slice()
				.reverse()
				.map((x) => ({
					day: new Date(x.day as any).toISOString(),
					clicks: Number(x.clicks) || 0,
					visitors: Number(x.visitors) || 0,
				})),
			topCountries: topCountries.map((x) => ({
				country: x.country,
				count: Number(x.count) || 0,
			})),
			links: links.map((x) => ({
				id: x.id,
				shortUrl: x.shortUrl,
				destinationUrl: x.destinationUrl,
				createdAt: new Date(x.createdAt as any).toISOString(),
				totalClicks: Number(x.totalClicks) || 0,
				uniqueVisitors: Number(x.uniqueVisitors) || 0,
			})),
		};

		return c.json(payload);
	});
}
