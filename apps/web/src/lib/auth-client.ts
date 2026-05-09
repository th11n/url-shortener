import { env } from "@url-shortener/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: `${env.NEXT_PUBLIC_SERVER_URL}/rpc/v1/auth`,
});
