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
import {
	ArrowRight,
	Check,
	CheckCircle2,
	Copy,
	Globe,
	Link2,
	Shield,
	Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";

type CreateUrlPayload = {
	originalUrl: string;
	slug?: string;
};

type CreateUrlResponse = {
	json?: {
		url?: {
			createdAt?: string;
			destinationUrl?: string;
			expiresAt?: string;
			id?: string;
			shortUrl?: string;
			userId?: string | null;
		};
		message?: string;
	};
	meta?: unknown[];
};

function formatExpiresAt(expiresAt?: string) {
	if (!expiresAt) return "";
	const d = new Date(expiresAt);
	// user timezone: Europe/Warsaw
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

	const [pendingPayload, setPendingPayload] = useState<CreateUrlPayload | null>(
		null,
	);
	const [isCreating, setIsCreating] = useState(false);

	const [result, setResult] = useState<{
		shortUrl: string;
		expiresAtFormatted: string;
		expiresAtRaw?: string;
	} | null>(null);

	const startConfetti = () => {
		const duration = 5 * 1000;
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
		const randomInRange = (min: number, max: number) =>
			Math.random() * (max - min) + min;
		const interval = window.setInterval(() => {
			const timeLeft = animationEnd - Date.now();
			if (timeLeft <= 0) {
				return clearInterval(interval);
			}
			const particleCount = 50 * (timeLeft / duration);
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
			});
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
			});
		}, 250);
	};

	const createUrl = useCallback(async (payload: CreateUrlPayload) => {
		setIsCreating(true);
		try {
			const res = await orpc.createUrl(payload);

			const shortUrl = res.url.shortUrl;
			if (!shortUrl) throw new Error("Short URL not found");

			const expiresAtRaw = res.url.expiresAt?.toString();
			if (!expiresAtRaw) throw new Error("Expires at not found");
			const expiresAtFormatted = formatExpiresAt(expiresAtRaw);

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

	const onSignIn = async () => {
		window.location.href = "/login";
	};

	const onCopy = () => {
		navigator.clipboard.writeText(
			process.env.NEXT_PUBLIC_BASE_URL + "/" + result?.shortUrl,
		);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<>
			<div className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-background">
				<div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

				<div className="container relative z-10 px-4 md:px-6">
					<div className="flex flex-col items-center space-y-10 text-center">
						<div className="fade-in slide-in-from-top-4 animate-in duration-700">
							<Badge
								variant="secondary"
								className="border border-border px-4 py-1.5 font-medium text-xs uppercase tracking-widest"
							>
								<span className="relative mr-2 flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
								v1.0 is now live
							</Badge>
						</div>

						<div className="max-w-4xl space-y-6">
							<h1 className="text-balance font-bold text-5xl text-foreground tracking-tighter md:text-7xl">
								Trim your links. <br />
								<span className="font-serif text-muted-foreground italic">
									Expand
								</span>{" "}
								your reach.
							</h1>
							<p className="mx-auto max-w-[650px] font-light text-lg text-muted-foreground md:text-xl">
								Create short, branded links that drive results. Built for
								developers and marketers who demand speed and precision.
							</p>
						</div>

						<div className="fade-in zoom-in-95 w-full max-w-2xl animate-in delay-200 duration-1000">
							<div className="group relative rounded-2xl border border-border bg-card/50 p-2 shadow-2xl backdrop-blur-sm transition-all duration-300 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
								<form
									onSubmit={onSubmit}
									className="flex flex-col items-center gap-2 md:flex-row"
								>
									<div className="relative w-full flex-1">
										<Link2 className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
										<Input
											type="url"
											name="url"
											required
											placeholder="Paste your long destination URL..."
											className="h-14 border-none bg-transparent pr-4 pl-12 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</div>

									<Button
										type="submit"
										size="lg"
										className="h-14 w-full px-8 font-semibold text-base transition-all hover:gap-3 active:scale-95 md:w-auto"
										disabled={isCreating || sessionPending}
									>
										{isCreating ? "Shortening..." : "Shorten Now"}
										<ArrowRight className="ml-2 h-4 w-4 transition-all" />
									</Button>
								</form>
							</div>

							<div className="mt-6 flex flex-wrap justify-center gap-6 font-medium text-muted-foreground/80 text-sm">
								<div className="flex items-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Custom Slugs</span>
								</div>
								<div className="flex items-center gap-1.5">
									<Globe className="h-4 w-4 text-primary" />
									<span>Geo-Targeting</span>
								</div>
								<div className="flex items-center gap-1.5">
									<Shield className="h-4 w-4 text-primary" />
									<span>Enterprise Security</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="absolute right-0 bottom-0 left-0 h-24 bg-gradient-to-t from-background to-transparent" />
			</div>

			{/* Auth gate modal */}
			<Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
				<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
					{/* Header strip */}
					<div className="relative bg-card/60 p-6 pb-5 backdrop-blur">
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#80808014,transparent_55%)]" />
						<div className="relative">
							<div className="flex items-start justify-between gap-4">
								<div className="space-y-2">
									<DialogTitle className="text-xl sm:text-2xl">
										Sign in to manage this link
									</DialogTitle>

									<DialogDescription className="text-sm sm:text-base">
										Create an account to track clicks, edit settings, and extend
										expiration anytime. Or skip for now - we’ll create a link
										that expires in ~30 days.
									</DialogDescription>
								</div>
							</div>

							<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div className="rounded-xl border border-border bg-background/40 p-3">
									<div className="flex items-center gap-2 font-semibold text-sm">
										<CheckCircle2 className="h-4 w-4 text-primary" />
										Analytics
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										See clicks, referrers & performance.
									</p>
								</div>

								<div className="rounded-xl border border-border bg-background/40 p-3">
									<div className="flex items-center gap-2 font-semibold text-sm">
										<Globe className="h-4 w-4 text-primary" />
										Targeting
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										Geo rules & smart routing.
									</p>
								</div>

								<div className="rounded-xl border border-border bg-background/40 p-3">
									<div className="flex items-center gap-2 font-semibold text-sm">
										<Shield className="h-4 w-4 text-primary" />
										Control
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										Edit slug, extend expiry, secure access.
									</p>
								</div>
							</div>
							<div className="mt-4 rounded-xl border border-border bg-card/40 p-4">
								<div className="flex items-start gap-3">
									<div className="mt-0.5 rounded-lg border border-border bg-background/40 p-2">
										<Link2 className="h-4 w-4 text-primary" />
									</div>
									<div className="space-y-1">
										<div className="font-semibold text-sm">Quick note</div>
										<p className="text-muted-foreground text-sm">
											Skipped links are temporary. Sign in later to claim &
											manage them.
										</p>
									</div>
								</div>
							</div>
							<p className="mt-3 text-muted-foreground text-xs">
								No spam. One-click sign in. You can delete links anytime.
							</p>
						</div>
					</div>

					<div className="p-6">
						<DialogFooter className="mt-5 flex-col gap-2 sm:flex-row sm:gap-2">
							<Button
								variant="outline"
								onClick={onSkipAndCreate}
								disabled={isCreating}
								className="h-11 w-full sm:w-auto"
							>
								Skip &amp; create
								<ArrowRight className="ml-2 h-4 w-4 opacity-70" />
							</Button>

							<Button
								onClick={onSignIn}
								disabled={isCreating}
								className="h-11 w-full sm:w-auto"
							>
								Sign in &amp; manage
								<Shield className="ml-2 h-4 w-4" />
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>

			{/* Result modal */}
			<Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
				<DialogContent className="overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-[500px]">
					<div className="pointer-events-none absolute inset-0 h-32 bg-[linear-gradient(to_bottom,rgba(var(--primary),0.05),transparent)]" />

					<div className="relative p-8">
						<DialogHeader className="items-center space-y-4 text-center">
							<div className="zoom-in-50 flex h-14 w-14 animate-in items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 duration-500">
								<Sparkles className="h-7 w-7 text-primary" />
							</div>
							<div className="space-y-1">
								<DialogTitle className="font-bold text-2xl tracking-tighter sm:text-3xl">
									Magic link ready!
								</DialogTitle>
								<DialogDescription className="text-center font-medium text-muted-foreground">
									{result?.expiresAtFormatted ? (
										<>
											Expires on{" "}
											<span className="text-foreground">
												{result.expiresAtFormatted}
											</span>
										</>
									) : (
										"Your link is shortened and ready to share."
									)}
								</DialogDescription>
							</div>
						</DialogHeader>

						<div className="mt-8 space-y-6">
							{/* Główny Box z linkiem */}
							<div className="group relative rounded-2xl border border-border bg-background/50 p-2 transition-all focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/30">
								<div className="flex items-center gap-2">
									<div className="min-w-0 flex-1 px-3">
										<span className="font-bold text-muted-foreground/60 text-xs uppercase tracking-widest">
											Short URL
										</span>
										<div className="mt-0.5 truncate font-semibold text-foreground text-lg tracking-tight">
											{process.env.NEXT_PUBLIC_BASE_URL}/{result?.shortUrl}
										</div>
									</div>

									<Button
										onClick={onCopy}
										size="icon"
										className={`h-12 w-12 rounded-xl transition-all duration-300 ${copied ? "bg-green-600 hover:bg-green-600" : "bg-primary"}`}
									>
										{copied ? (
											<Check className="h-5 w-5" />
										) : (
											<Copy className="h-5 w-5" />
										)}
									</Button>
								</div>
							</div>

							{/* Promo info dla Gościa */}
							{!session?.user && (
								<div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-center">
									<p className="text-muted-foreground text-xs leading-relaxed">
										<span className="font-semibold text-primary">Pro tip:</span>{" "}
										Sign up to track clicks, create custom links and more.
									</p>
								</div>
							)}
						</div>

						<DialogFooter className="mt-8">
							<Button
								onClick={() => setIsResultModalOpen(false)}
								className="h-12 w-full border-border font-semibold text-base transition-all active:scale-95"
							>
								Close
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
