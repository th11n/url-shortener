import type { RouterClient } from "@orpc/server";
import { db } from "@url-shortener/db";
import { urls } from "@url-shortener/db/schema/urls";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../index";

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

			console.log(context.session?.user);
			console.log(isUser);

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
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
