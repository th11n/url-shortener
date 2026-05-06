"use client";

import { useGSAP } from "@gsap/react";
import { Button } from "@url-shortener/ui/components/button";
import { Card, CardContent } from "@url-shortener/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@url-shortener/ui/components/dialog";
import { Input } from "@url-shortener/ui/components/input";
import gsap from "gsap";
import { Activity, Layers, Link2, MousePointerClick, Plus, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import LinksTable from "@/components/links-table";
import MagicRings from "@/components/rings";
import { StripedPattern } from "@/components/strips";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";

export default function DashboardPage() {
	const { data: session, isPending } = authClient.useSession();
	const containerRef = useRef<HTMLDivElement>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null);

	useGSAP(
		() => {
			gsap.from(".dash-card", {
				y: 40,
				opacity: 0,
				duration: 0.8,
				stagger: 0.1,
				ease: "power4.out",
			});
		},
		{ scope: containerRef },
	);

	if (isPending)
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
			</div>
		);

	if (!session?.user) {
		redirect("/login");
		return null;
	}

	const onCreateLink = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isCreating) return;
		const form = new FormData(e.currentTarget);
		const originalUrl = String(form.get("url") || "").trim();
		const slugRaw = String(form.get("slug") || "").trim();
		const slug = slugRaw ? slugRaw : undefined;
		if (!originalUrl) return;

		setIsCreating(true);
		try {
			const res = await orpc.createUrl({ originalUrl, slug });
			const shortUrl = res.url.shortUrl;
			if (!shortUrl) throw new Error("Short URL not found");
			setCreatedShortUrl(shortUrl);
			toast.success("Link created");
			e.currentTarget.reset();
		} catch (err) {
			console.error("[Dashboard] create link error:", err);
			toast.error("Failed to create link");
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div
			ref={containerRef}
			className="relative min-h-screen bg-background px-4 pt-40 pb-20 font-geist-sans selection:bg-primary/20 selection:text-primary before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-full before:pointer-events-none before:opacity-[0.02] before:content-[''] before:bg-[url('https://www.ui-layouts.com/noise.gif')] md:px-8"
		>
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

			<div className="relative z-20 mx-auto max-w-7xl space-y-16">
				<header className="dash-card flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
					<div className="space-y-2">
						<h1 className="font-outfit text-5xl leading-none tracking-tight text-white font-light md:text-7xl">Dashboard</h1>
						<p className="text-lg font-light text-white/55">
							Welcome, <span className="text-white/90">{session.user.name}</span>.
						</p>
					</div>
					<Button
						size="lg"
						onClick={() => {
							setCreatedShortUrl(null);
							setIsCreateOpen(true);
						}}
						className="h-14 rounded-full border border-white/10 bg-white px-8 text-sm font-medium text-black shadow-none transition-all hover:bg-white/90"
					>
						<Plus className="mr-3 h-5 w-5" />
						Create Link
					</Button>
				</header>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{[
						{ label: "Total Engagement", value: "24.5k", icon: MousePointerClick, trend: "+12.4%", color: "text-blue-400" },
						{ label: "Active Assets", value: "142", icon: Link2, trend: "+3", color: "text-violet-300" },
						{ label: "CTR average", value: "3.2%", icon: TrendingUp, trend: "+0.4%", color: "text-emerald-300" },
					].map((stat) => (
						<Card key={stat.label} className="dash-card relative overflow-hidden border border-white/10 bg-black/55 shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)] backdrop-blur-3xl py-0">
							<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
							<div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />
							<CardContent className="relative space-y-8 p-8">
								<div className="flex items-center justify-between">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
										<stat.icon className={`h-6 w-6 ${stat.color}`} />
									</div>
									<div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
										<TrendingUp className="h-3 w-3" />
										{stat.trend}
									</div>
								</div>
								<div className="space-y-1">
									<div className="font-outfit text-sm font-medium uppercase tracking-widest text-white/45">{stat.label}</div>
									<div className="font-outfit text-5xl font-light tracking-tight text-white tabular-nums">{stat.value}</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="dash-card">
					<div className="mb-8 flex items-center gap-3">
						<Layers className="h-6 w-6 text-white/75" />
						<h2 className="font-outfit text-3xl font-light tracking-tight text-white">Your Assets</h2>
					</div>
					<LinksTable baseUrl={process.env.NEXT_PUBLIC_BASE_URL} />
				</div>
			</div>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="overflow-hidden border border-white/10 bg-black/55 p-0 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-3xl sm:max-w-[520px]">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
					<div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />
					<div className="relative p-8 md:p-10">
						<DialogHeader className="text-left">
							<DialogTitle className="text-3xl font-light tracking-tight text-white">Create Link</DialogTitle>
							<DialogDescription className="pt-2 text-sm font-light text-white/45">
								Add a destination URL and optional custom slug.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={onCreateLink} className="mt-6 space-y-4">
							<Input
								name="url"
								type="url"
								required
								placeholder="https://example.com/very-long-url"
								className="h-12 border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 focus-visible:ring-0"
							/>
							<Input
								name="slug"
								placeholder="custom-slug (optional)"
								className="h-12 border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 focus-visible:ring-0"
							/>

							{createdShortUrl && (
								<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
									Created: {process.env.NEXT_PUBLIC_BASE_URL}/{createdShortUrl}
								</div>
							)}

							<Button
								type="submit"
								disabled={isCreating}
								className="h-12 w-full rounded-full border border-white/10 bg-white font-medium text-black hover:bg-white/90"
							>
								{isCreating ? "Creating..." : "Create Link"}
							</Button>
						</form>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
