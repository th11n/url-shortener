CREATE TYPE "public"."device_type" AS ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown');--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" "inet",
	"country" char(2),
	"region" varchar(128),
	"city" varchar(128),
	"referrer" text,
	"user_agent" text,
	"device" "device_type" DEFAULT 'unknown' NOT NULL,
	"browser" varchar(64),
	"os" varchar(64),
	"is_bot" boolean DEFAULT false NOT NULL,
	"utm_source" varchar(128),
	"utm_medium" varchar(128),
	"utm_campaign" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "link_daily_stats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"day" timestamp NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"bot_clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "urls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"destination_url" text NOT NULL,
	"short_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_urls_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_daily_stats" ADD CONSTRAINT "link_daily_stats_link_id_urls_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_clicks_link_ts_idx" ON "link_clicks" USING btree ("link_id","ts");--> statement-breakpoint
CREATE INDEX "link_clicks_link_ip_idx" ON "link_clicks" USING btree ("link_id","ip");--> statement-breakpoint
CREATE INDEX "link_clicks_link_country_idx" ON "link_clicks" USING btree ("link_id","country");--> statement-breakpoint
CREATE INDEX "link_clicks_link_bot_idx" ON "link_clicks" USING btree ("link_id","is_bot");--> statement-breakpoint
CREATE UNIQUE INDEX "link_daily_unique_idx" ON "link_daily_stats" USING btree ("link_id","day");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "urls_userId_idx" ON "urls" USING btree ("user_id");