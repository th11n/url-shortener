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
const rpcV1 = new RPCHandler(appRouterV1, {
	interceptors: [onError(console.error)],
});
export const apiV1Handler = new OpenAPIHandler(appRouterV1, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/rpc/v1/auth/*", (c) => auth.handler(c.req.raw));

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const apiV1Result = await apiV1Handler.handle(c.req.raw, {
		prefix: "/api-reference/v1",
		context,
	});

	if (apiV1Result.matched) {
		return c.newResponse(apiV1Result.response.body, apiV1Result.response);
	}

	await next();
});

app.use("/rpc/v1/*", async (c, next) => {
	const context = await createContext({ context: c });

	const { matched, response } = await rpcV1.handle(c.req.raw, {
		prefix: "/rpc/v1",
		context,
	});

	if (matched) return c.newResponse(response.body, response);

	await next();
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
