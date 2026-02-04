import type { RouterClient } from "@orpc/server";
import { ORPCError, os } from "@orpc/server";
import { db } from "@url-shortener/db";
import { urls } from "@url-shortener/db/schema/urls";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Context } from "../../context";
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

export const appRouter = {
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
				console.log("cached", cached);
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
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
