import {
	bigserial,
	boolean,
	char,
	index,
	inet,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import { urls } from "./urls";

export const deviceEnum = pgEnum("device_type", [
	"desktop",
	"mobile",
	"tablet",
	"bot",
	"unknown",
]);

export const linkClicks = pgTable(
	"link_clicks",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),

		linkId: text("link_id")
			.notNull()
			.references(() => urls.id, { onDelete: "cascade" }),

		ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),

		ip: inet("ip"),

		country: char("country", { length: 2 }), // PL, DE
		region: varchar("region", { length: 128 }),
		city: varchar("city", { length: 128 }),

		referrer: text("referrer"),
		userAgent: text("user_agent"),

		device: deviceEnum("device").default("unknown").notNull(),
		browser: varchar("browser", { length: 64 }),
		os: varchar("os", { length: 64 }),

		isBot: boolean("is_bot").default(false).notNull(),

		utmSource: varchar("utm_source", { length: 128 }),
		utmMedium: varchar("utm_medium", { length: 128 }),
		utmCampaign: varchar("utm_campaign", { length: 128 }),
	},
	(t) => ({
		// dashboard queries
		linkTimeIdx: index("link_clicks_link_ts_idx").on(t.linkId, t.ts),

		// unique visitors
		linkIpIdx: index("link_clicks_link_ip_idx").on(t.linkId, t.ip),

		// top countries
		linkCountryIdx: index("link_clicks_link_country_idx").on(
			t.linkId,
			t.country,
		),

		// bot filtering
		linkBotIdx: index("link_clicks_link_bot_idx").on(t.linkId, t.isBot),
	}),
);

export const linkDailyStats = pgTable(
	"link_daily_stats",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),

		linkId: text("link_id")
			.notNull()
			.references(() => urls.id, { onDelete: "cascade" }),

		day: timestamp("day", { withTimezone: false }).notNull(),

		totalClicks: integer("total_clicks").default(0).notNull(),
		uniqueVisitors: integer("unique_visitors").default(0).notNull(),
		botClicks: integer("bot_clicks").default(0).notNull(),
	},
	(t) => ({
		uniqueDay: uniqueIndex("link_daily_unique_idx").on(t.linkId, t.day),
	}),
);
