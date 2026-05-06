"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import MagicRings from "@/components/rings";
import { StripedPattern } from "@/components/strips";
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
		<div className="relative min-h-screen bg-background selection:bg-primary/20 selection:text-primary before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-full before:pointer-events-none before:opacity-[0.02] before:content-[''] before:bg-[url('https://www.ui-layouts.com/noise.gif')]">
			<StripedPattern className="text-white/10" />
			<div className="absolute inset-0">
				<MagicRings
					color="#A855F7"
					colorTwo="#6366F1"
					ringCount={3}
					speed={1}
					attenuation={10}
					lineThickness={2}
					baseRadius={0.65}
					radiusStep={0.1}
					scaleRate={0.1}
					opacity={1}
					blur={0}
					noiseAmount={0.1}
					rotation={0}
					ringGap={1.5}
					fadeIn={0.7}
					fadeOut={0.5}
					followMouse={false}
					mouseInfluence={0}
					hoverScale={1}
					parallax={0}
					clickBurst={false}
				/>
			</div>
			<div className="relative z-20">
				<Loader fullScreen label="Redirecting..." />
			</div>
		</div>
	);
}
