import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@url-shortener/api/context";
import { appRouter as appRouterV1 } from "@url-shortener/api/routers/v1/index";
import { auth } from "@url-shortener/auth";
import { env } from "@url-shortener/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// 1. CORS - Musi być absolutnie pierwszy
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Cookie"],
		credentials: true,
	}),
);

// 2. Auth handler
app.on(["POST", "GET"], "/rpc/v1/auth/*", (c) => auth.handler(c.req.raw));

// 3. Logger (poza trasami streamowanymi najlepiej)
app.use(logger());

// 4. OpenAPI & RPC Handlers
export const apiV1Handler = new OpenAPIHandler(appRouterV1, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [onError(console.error)],
});

const rpcV1 = new RPCHandler(appRouterV1, {
	interceptors: [onError(console.error)],
});

// Główny handler dla wszystkiego pod /rpc/v1/
app.all("/rpc/v1/*", async (c) => {
	const context = await createContext({ context: c });

	console.log(`[server] RPC request: ${c.req.method} ${c.req.url}`);

	const { matched, response } = await rpcV1.handle(c.req.raw, {
		prefix: "/rpc/v1",
		context,
	});

	if (matched) {
		console.log(`[server] RPC matched: ${c.req.url}`);
		return c.newResponse(response.body, response);
	}

	console.log(
		`[server] RPC NOT MATCHED: ${c.req.url}. Keys in router: ${Object.keys(appRouterV1).join(", ")}`,
	);
	return c.text("Not Found", 404);
});

// Handler dla API Reference
app.all("/api-reference/v1/*", async (c) => {
	const context = await createContext({ context: c });
	const result = await apiV1Handler.handle(c.req.raw, {
		prefix: "/api-reference/v1",
		context,
	});
	if (result.matched)
		return c.newResponse(result.response.body, result.response);
	return c.text("Not Found", 404);
});

app.get("/", (c) => c.text("OK"));

export default app;
