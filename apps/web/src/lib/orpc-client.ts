import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@url-shortener/api/routers/v1/index";

const link = new RPCLink({
	url: process.env.NEXT_PUBLIC_SERVER_URL!,
});

export const orpc: RouterClient<typeof appRouter> = createORPCClient(link);
