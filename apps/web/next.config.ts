import "@url-shortener/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: ["@url-shortener/ui"],
};

export default nextConfig;
