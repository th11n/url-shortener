import { db } from "@url-shortener/db";
import { linkClicks, linkDailyStats } from "@url-shortener/db/schema/analytics";
import { urls } from "@url-shortener/db/schema/urls";
import amqp from "amqplib";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { ConsumeMessage } from "./types/amqplib";

type ClickEvent = {
	slug: string;
	ts: string;

	ip: string | null;
	country: string | null;
	region: string | null;
	city: string | null;

	referrer: string | null;
	userAgent: string | null;

	device: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
	browser: string | null;
	os: string | null;

	isBot: boolean;

	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
};

const RABBIT_URL = process.env.RABBITMQ_URL!;
const EXCHANGE = process.env.RABBITMQ_CLICK_EXCHANGE ?? "clicks";
const ROUTING_KEY = "click";

const QUEUE = process.env.RABBITMQ_CLICK_QUEUE ?? "clicks.insert.v1";

const PREFETCH = Number(process.env.RABBITMQ_PREFETCH ?? 50);

if (!RABBIT_URL) throw new Error("Missing RABBITMQ_URL");

async function resolveLinkId(
	slug: string,
	tsIso: string,
): Promise<string | null> {
	const ts = new Date(tsIso);

	const row = await db
		.select({ id: urls.id })
		.from(urls)
		.where(and(eq(urls.shortUrl, slug), lte(urls.createdAt, ts)))
		.orderBy(desc(urls.createdAt))
		.limit(1);

	return row[0]?.id ?? null;
}

async function handleEvent(evt: ClickEvent) {
	const linkId = await resolveLinkId(evt.slug, evt.ts);
	if (!linkId) {
		console.warn(`[worker] Could not resolve link for slug: ${evt.slug}`);
		return;
	}

	const clickDate = new Date(evt.ts);
	const dayDate = new Date(clickDate);
	dayDate.setUTCHours(0, 0, 0, 0);

	try {
		await db.transaction(async (tx) => {
			await tx.insert(linkClicks).values({
				linkId,
				ts: clickDate,
				ip: evt.ip,
				country: evt.country,
				region: evt.region,
				city: evt.city,
				referrer: evt.referrer,
				userAgent: evt.userAgent,
				device: evt.device,
				browser: evt.browser,
				os: evt.os,
				isBot: evt.isBot,
				utmSource: evt.utmSource,
				utmMedium: evt.utmMedium,
				utmCampaign: evt.utmCampaign,
			});

			await tx
				.insert(linkDailyStats)
				.values({
					linkId,
					day: dayDate,
					totalClicks: 1,
					uniqueVisitors: 1,
					botClicks: evt.isBot ? 1 : 0,
				})
				.onConflictDoUpdate({
					target: [linkDailyStats.linkId, linkDailyStats.day],
					set: {
						totalClicks: sql`${linkDailyStats.totalClicks} + 1`,
						botClicks: evt.isBot
							? sql`${linkDailyStats.botClicks} + 1`
							: linkDailyStats.botClicks,
					},
				});
		});

		const channel = `la${linkId.replace(/-/g, "")}`;
		const payload = JSON.stringify({
			type: "click_added",
			at: Date.now(),
		});

		await db.execute(sql`SELECT pg_notify(${channel}, ${payload})`);
		console.log(
			`[worker] [${new Date().toISOString()}] NOTIFIED: channel=${channel} for link=${linkId}`,
		);
	} catch (err) {
		console.error(`[worker] Error handling event for slug ${evt.slug}:`, err);
	}
}

async function main() {
	const conn = await amqp.connect(RABBIT_URL);
	const ch = await conn.createChannel();

	await ch.assertExchange(EXCHANGE, "topic", { durable: true });

	await ch.assertQueue(QUEUE, { durable: true });

	await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

	ch.prefetch(PREFETCH);

	console.log("[worker] config", { RABBIT_URL, EXCHANGE, ROUTING_KEY, QUEUE });

	ch.consume(
		QUEUE,
		async (msg: ConsumeMessage | null) => {
			if (!msg) return;

			try {
				const raw = msg.content.toString("utf8");
				const evt = JSON.parse(raw) as ClickEvent;

				if (!evt.slug || !evt.ts) {
					ch.ack(msg);
					return;
				}

				await handleEvent(evt);

				console.log("[worker] handled", evt.slug);

				ch.ack(msg);
			} catch (err) {
				console.error("[worker] failed", err);

				ch.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);

	const shutdown = async () => {
		console.log("[worker] shutting down...");
		try {
			await ch.close();
		} catch {}
		try {
			await conn.close();
		} catch {}
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
