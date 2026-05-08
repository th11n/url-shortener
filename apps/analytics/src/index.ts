import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createContext } from "@url-shortener/api/context";
import { corsOrigins } from "@url-shortener/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { analyticsRouter } from "./router";
import {
	registerAnalyticsRoutes,
	registerAnalyticsSummaryRoutes,
} from "./routes/analytics";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: corsOrigins,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Cookie"],
		credentials: true,
	}),
);

const rpc = new RPCHandler(analyticsRouter, {
	interceptors: [onError(console.error)],
});

app.all("/rpc/v1/*", async (c) => {
	const context = await createContext({ context: c });
	const { matched, response } = await rpc.handle(c.req.raw, {
		prefix: "/rpc/v1",
		context,
	});

	if (matched) return c.newResponse(response.body, response);
	return c.text("Not Found", 404);
});

registerAnalyticsRoutes(app);
registerAnalyticsSummaryRoutes(app);

export default app;
export type { AnalyticsRouter } from "./router";
