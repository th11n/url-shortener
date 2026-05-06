"use client";

import { Badge } from "@url-shortener/ui/components/badge";
import { Button } from "@url-shortener/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@url-shortener/ui/components/dialog";
import { Input } from "@url-shortener/ui/components/input";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
	ArrowRight,
	Check,
	CheckCircle2,
	Copy,
	Globe,
	Link2,
	Shield,
	Sparkles,
	Zap,
	BarChart3,
	MousePointerClick,
} from "lucide-react";
import { useCallback, useState, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";
import MagicRings from "@/components/rings";
import { StripedPattern } from "@/components/strips";

type CreateUrlPayload = {
	originalUrl: string;
	slug?: string;
};

function formatExpiresAt(expiresAt?: string) {
	if (!expiresAt) return "";
	const d = new Date(expiresAt);
	return new Intl.DateTimeFormat("pl-PL", {
		timeZone: "Europe/Warsaw",
		year: "numeric",
		month: "long",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
}

export default function Home() {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isResultModalOpen, setIsResultModalOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [pendingPayload, setPendingPayload] = useState<CreateUrlPayload | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [result, setResult] = useState<{
		shortUrl: string;
		expiresAtFormatted: string;
		expiresAtRaw?: string;
	} | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);

	const startConfetti = () => {
		const duration = 5 * 1000;
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
		const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
		const interval = window.setInterval(() => {
			const timeLeft = animationEnd - Date.now();
			if (timeLeft <= 0) return clearInterval(interval);
			const particleCount = 50 * (timeLeft / duration);
			confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
			confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
		}, 250);
	};

	const createUrl = useCallback(async (payload: CreateUrlPayload) => {
		setIsCreating(true);
		try {
			const res = await orpc.createUrl(payload);
			const shortUrl = res.url.shortUrl;
			if (!shortUrl) throw new Error("Short URL not found");
			const expiresAtRaw = res.url.expiresAt?.toString();
			const expiresAtFormatted = expiresAtRaw ? formatExpiresAt(expiresAtRaw) : "";
			setResult({ shortUrl, expiresAtFormatted, expiresAtRaw });
			setIsResultModalOpen(true);
		} finally {
			setIsCreating(false);
		}
	}, []);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const originalUrl = String(form.get("url") || "").trim();
		const slugRaw = String(form.get("slug") || "").trim();
		const slug = slugRaw ? slugRaw : undefined;
		const payload: CreateUrlPayload = { originalUrl, slug };

		if (!session?.user) {
			setPendingPayload(payload);
			setIsAuthModalOpen(true);
			return;
		}
		await createUrl(payload);
	};

	const onSkipAndCreate = async () => {
		if (!pendingPayload) return;
		setIsAuthModalOpen(false);
		await createUrl(pendingPayload);
		setPendingPayload(null);
		startConfetti();
	};

	const onCopy = () => {
		navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL}/${result?.shortUrl}`);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="relative min-h-screen bg-background selection:bg-primary/20 selection:text-primary before:absolute before:top-0 before:left-0 before:w-full
     before:h-full before:content-[''] before:opacity-[0.02] before:z-10 before:pointer-events-none
     before:bg-[url('https://www.ui-layouts.com/noise.gif')]">
			<StripedPattern className="text-white/10" />

			<main className="relative z-10 h-full">
				{/* Hero Section */}
				<section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20">
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
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
						className="container flex flex-col items-center text-center"
					>
						<h1 className="max-w-6xl text-balance font-thin text-6xl tracking-wide leading-32 text-foreground sm:text-7xl lg:text-8xl">
							Shorten the gap between <br />
							<span className="relative">
								<span className="relative z-10">Your Vision</span>
							</span> & Result.
						</h1>

						<p className="mt-8 max-w-[700px] text-balance font-medium text-lg text-muted-foreground/80 leading-relaxed md:text-xl">
							Create powerful, branded short links in seconds.
							<span className="text-foreground"> Built for growth</span>, engineered for performance.
						</p>

						{/* Shortener Tool */}
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
							className="mt-14 w-full max-w-4xl"
						>
							<form
								onSubmit={onSubmit}
								className="group relative mx-auto flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] p-2 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20 focus-within:border-white/25"
							>
								<div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-white/[0.07] via-transparent to-white/[0.03]" />
								<div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.04]" />

								<div className="relative flex h-16 flex-1 items-center gap-4 px-5">
									<Link2 className="h-5 w-5 shrink-0 text-white/35 transition-colors duration-300 group-focus-within:text-white/70" />

									<Input
										type="url"
										name="url"
										required
										placeholder="Paste your URL"
										className="h-full border-0 bg-transparent! px-0 text-lg font-light tracking-tight text-white shadow-none outline-none placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
									/>
								</div>

								<Button
									type="submit"
									size="lg"
									disabled={isCreating || sessionPending}
									className="relative h-16 rounded-full border border-white/10 bg-white text-black px-8 text-base font-medium tracking-tight shadow-none transition-all duration-300 hover:bg-white/90 hover:scale-[1.015] active:scale-[0.985] disabled:opacity-50 md:px-10"
								>
									<span className="relative z-10 flex items-center">
										{isCreating ? "Shortening" : "Shorten"}
										<ArrowRight className="ml-2 h-4 w-4" />
									</span>
								</Button>
							</form>
						</motion.div>
					</motion.div>
				</section>

			</main>

			<AnimatePresence>
				{isAuthModalOpen && (
					<Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
						<DialogContent className="overflow-hidden border border-white/10 bg-black/55 p-0 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-3xl sm:max-w-[520px]">
							<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
							<div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />

							<div className="relative p-8 md:p-10">
								<DialogHeader className="items-center text-center">
									<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
										<Shield className="h-6 w-6 text-white/75" />
									</div>

									<DialogTitle className="text-3xl font-light tracking-tight text-white md:text-4xl">
										Keep your link
									</DialogTitle>

									<DialogDescription className="max-w-sm pt-3 text-sm font-light leading-relaxed text-white/45 md:text-base">
										Sign in to save links permanently, edit destinations, and track clicks over time.
									</DialogDescription>
								</DialogHeader>

								<div className="mt-8 flex flex-col gap-3">
									<Button
										onClick={() => window.location.href = "/login"}
										size="lg"
										className="h-14 rounded-full bg-white px-8 text-sm font-medium text-black shadow-none transition-all duration-300 hover:bg-white/90 hover:scale-[1.01] active:scale-[0.99]"
									>
										Sign in or create account
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>

									<Button
										variant="ghost"
										onClick={onSkipAndCreate}
										className="h-14 rounded-full text-sm font-light text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80"
									>
										Continue without account
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</AnimatePresence>

			<Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
				<DialogContent className="overflow-hidden border border-white/10 bg-black/55 p-0 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-3xl sm:max-w-[520px]">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
					<div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />
					<div className="relative p-8 md:p-10">

						<DialogHeader className="items-center text-center">
							<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
								<Sparkles className="h-6 w-6 text-white/75" />
							</div>
							<DialogTitle className="text-3xl font-light tracking-tight text-white md:text-4xl">Link Ready!</DialogTitle>
							<DialogDescription className="max-w-sm pt-3 text-sm font-light leading-relaxed text-white/45 md:text-base">
								{result?.expiresAtFormatted ? `Expires on ${result.expiresAtFormatted}` : "Your magic link is ready to share."}
							</DialogDescription>
						</DialogHeader>

						<div className="mt-8 space-y-4">
							<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:p-6">
								<div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-white/[0.05] via-transparent to-white/[0.03]" />
								<div className="flex flex-col gap-4">
									<div className="flex items-center gap-3">
										<div className="min-w-0 flex-1 truncate text-lg font-light tracking-tight text-white font-mono">
											{process.env.NEXT_PUBLIC_BASE_URL}/{result?.shortUrl}
										</div>
										<Button
											onClick={onCopy}
											size="icon"
											aria-label={copied ? "Copied" : "Copy link"}
											className={`h-9 w-9 shrink-0 rounded-lg border bg-transparent shadow-none transition-colors ${copied
												? "border-emerald-400/40 text-emerald-300"
												: "border-white/20 text-white/80 hover:border-white/35 hover:text-white"
												}`}
										>
											{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
										</Button>
									</div>
								</div>
							</div>
						</div>

						<Button
							variant="ghost"
							onClick={() => setIsResultModalOpen(false)}
							className="mt-6 h-14 w-full rounded-full text-sm font-light text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80"
						>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
