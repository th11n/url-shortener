"use client";

import { Badge } from "@url-shortener/ui/components/badge";
import { Button } from "@url-shortener/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@url-shortener/ui/components/dialog";
import { Input } from "@url-shortener/ui/components/input";
import { ArrowRight, CheckCircle2, Globe, Link2, Shield } from "lucide-react";
import * as React from "react";

import { authClient } from "@/lib/auth-client";

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

	const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
	const [isResultModalOpen, setIsResultModalOpen] = React.useState(false);

	const [pendingPayload, setPendingPayload] =
		React.useState<CreateUrlPayload | null>(null);
	const [isCreating, setIsCreating] = React.useState(false);

	const [result, setResult] = React.useState<{
		shortUrl: string;
		expiresAtFormatted: string;
		expiresAtRaw?: string;
	} | null>(null);

	const createUrl = React.useCallback(async (payload: CreateUrlPayload) => {
		setIsCreating(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_SERVER_URL}/rpc/v1/createUrl`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						json: payload,
						meta: [],
					}),
				},
			);

			const data = (await res.json()) as CreateUrlResponse;
			if (!res.ok) throw new Error(data?.json?.message ?? "Request failed");

			const shortUrl = data?.json?.url?.shortUrl;
			const expiresAtRaw = data?.json?.url?.expiresAt;
			const expiresAtFormatted = formatExpiresAt(expiresAtRaw);

			if (!shortUrl) throw new Error("Short URL not found");

			setResult({ shortUrl, expiresAtFormatted, expiresAtRaw });
			setIsResultModalOpen(true);
			return data;
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
	};

	const onSignIn = async () => {
		window.location.href = "/login";
	};

	const onCopy = async () => {
		if (!result?.shortUrl) return;
		await navigator.clipboard.writeText(result.shortUrl);
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
								v2.0 is now live
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
				<DialogContent className="overflow-hidden p-0 sm:max-w-[620px]">
					<div className="relative border-border border-b bg-card/60 p-6 pb-5 backdrop-blur">
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#80808014,transparent_55%)]" />
						<div className="relative">
							<div className="flex items-start justify-between gap-4">
								<div className="space-y-2">
									<div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-medium text-muted-foreground text-xs tracking-wide">
										<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
										Link created
									</div>

									<DialogTitle className="text-xl sm:text-2xl">
										Your short link is ready
									</DialogTitle>

									<DialogDescription className="text-sm sm:text-base">
										{result?.expiresAtFormatted ? (
											<>
												This link expires on{" "}
												<span className="font-semibold text-foreground">
													{result.expiresAtFormatted}
												</span>
												.
											</>
										) : (
											<>Short link created successfully.</>
										)}
										{!session?.user && (
											<span className="mt-2 block">
												You’re creating as a guest - links expire in ~30 days.
												Sign in to extend expiry and view analytics.
											</span>
										)}
									</DialogDescription>
								</div>
							</div>
						</div>
					</div>

					<div className="p-6 pt-5">
						<div className="rounded-2xl border border-border bg-card/40 p-4">
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="text-muted-foreground text-xs uppercase tracking-widest">
										Short URL
									</div>
									<div className="mt-2 flex items-center gap-2">
										<div className="min-w-0 flex-1">
											<Input
												readOnly
												value={result?.shortUrl ?? ""}
												className="h-11 bg-background/40"
											/>
										</div>
									</div>
								</div>

								<Button
									onClick={onCopy}
									className="h-11 shrink-0"
									disabled={!result?.shortUrl}
								>
									Copy
									<CheckCircle2 className="ml-2 h-4 w-4" />
								</Button>
							</div>

							<div className="mt-3 flex flex-wrap gap-2">
								<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-muted-foreground text-xs">
									<Globe className="h-3.5 w-3.5 text-primary" />
									Fast redirects
								</span>
								<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-muted-foreground text-xs">
									<Shield className="h-3.5 w-3.5 text-primary" />
									Safe by design
								</span>
							</div>
						</div>

						<DialogFooter className="mt-5 flex-col gap-2 sm:flex-row sm:gap-2">
							{!session?.user ? (
								<>
									<Button
										variant="outline"
										onClick={() => setIsResultModalOpen(false)}
										className="h-11 w-full sm:w-auto"
									>
										Done
									</Button>
									<Button onClick={onSignIn} className="h-11 w-full sm:w-auto">
										Sign in to extend &amp; track
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</>
							) : (
								<Button
									onClick={() => setIsResultModalOpen(false)}
									className="h-11 w-full sm:w-auto"
								>
									Done
								</Button>
							)}
						</DialogFooter>

						{!session?.user && (
							<p className="mt-3 text-muted-foreground text-xs">
								Tip: Sign in now to claim this link and keep it alive longer
								than 30 days.
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
