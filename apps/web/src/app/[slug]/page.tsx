"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { orpc } from "@/lib/orpc-client";

export default function Page() {
	const { slug } = useParams<{ slug: string }>();
	const router = useRouter();

	useEffect(() => {
		if (!slug) return;

		const run = async () => {
			fetch(`${process.env.NEXT_PUBLIC_ANALYTICS_URL}/track/${slug}`, {
				method: "POST",
				keepalive: true,
				credentials: "include",
			}).catch(() => {});

			const destination = await orpc.getUrl({ slug });

			if (typeof destination !== "string" || destination.length === 0) {
				router.replace("/");
				return;
			}

			window.location.replace(destination);
		};

		run();
	}, [slug, router]);

	return (
		<div className="absolute inset-0 flex items-center justify-center">
			<Loader />
		</div>
	);
}
