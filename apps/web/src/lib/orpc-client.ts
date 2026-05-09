import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@url-shortener/api/routers/v1/index";
import type { AnalyticsRouter } from "analytics";

const link = new RPCLink({
	url: `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"}/rpc/v1`,
	fetch: (url, init) =>
		fetch(url, {
			...init,
			credentials: "include",
		}),
});

export const orpc: RouterClient<typeof appRouter> = createORPCClient(link);

const analyticsLink = new RPCLink({
	url: `${process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost:3002"}/rpc/v1`,
	fetch: (url, init) =>
		fetch(url, {
			...init,
			credentials: "include",
		}),
});

export const analyticsOrpc: RouterClient<AnalyticsRouter> =
	createORPCClient(analyticsLink);
