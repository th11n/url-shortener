import { db } from "@url-shortener/db";
import { urls } from "@url-shortener/db/schema/urls";
import { desc, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";
import { publishJson } from "../rabbit";

type Device = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

type ClickEvent = {
	linkId: string;
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

function getClientIp(c: any) {
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

		const row = await db
			.select({ id: urls.id })
			.from(urls)
			.where(eq(urls.shortUrl, slug))
			.orderBy(desc(urls.createdAt))
			.limit(1);

		const link = row[0];
		if (!link) return c.body(null, 204);

		const ip = getClientIp(c);
		const ua = parseUa(c.req.header("user-agent"));
		const referrer = c.req.header("referer") ?? null;

		const reqUrl = new URL(c.req.url);
		const utmSource = reqUrl.searchParams.get("utm_source");
		const utmMedium = reqUrl.searchParams.get("utm_medium");
		const utmCampaign = reqUrl.searchParams.get("utm_campaign");

		const event: ClickEvent = {
			linkId: link.id,
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

		return c.body(null, 204);
	});
}
