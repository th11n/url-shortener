import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const urls = pgTable(
	"urls",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		destinationUrl: text("destination_url").notNull(),
		shortUrl: text("short_url").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").$defaultFn(
			() => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
		),
	},
	(table) => [index("urls_userId_idx").on(table.userId)],
);

export const urlsRelations = relations(urls, ({ one }) => ({
	user: one(user, {
		fields: [urls.userId],
		references: [user.id],
	}),
}));
