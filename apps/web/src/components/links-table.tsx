"use client";

import { Button } from "@url-shortener/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@url-shortener/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@url-shortener/ui/components/dropdown-menu";
import { Input } from "@url-shortener/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@url-shortener/ui/components/table";
import {
	BarChart2,
	Calendar,
	Copy,
	ExternalLink,
	Link as LinkIcon,
	MoreHorizontal,
	Search,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useEffect } from "react";
import { orpc } from "@/lib/orpc-client";

export type LinkItem = {
	id: string;
	shortUrl: string;
	destinationUrl: string;
	clicks: number;
	createdAt: string;
};

function clampUrl(u: string) {
	try {
		const url = new URL(u);
		return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
	} catch {
		return u;
	}
}

export default function LinksTable({ baseUrl }: { baseUrl?: string }) {
	const [q, setQ] = React.useState("");
	const [links, setLinks] = React.useState<LinkItem[]>([]);

	const filtered = React.useMemo(() => {
		const query = q.trim().toLowerCase();
		if (!query) return links;
		return links.filter((l) => {
			return (
				l.shortUrl.toLowerCase().includes(query) ||
				l.destinationUrl.toLowerCase().includes(query)
			);
		});
	}, [q, links]);

	const onCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
	};

	useEffect(() => {
		const controller = new AbortController();
		const fetchUrls = async () => {
			try {
				const response = await orpc.listUrls({ limit: 100, offset: 0 });
				const urlsArray = response.urls;
				if (!urlsArray || !Array.isArray(urlsArray)) {
					setLinks([]);
					return;
				}
				const mapped: LinkItem[] = urlsArray.map((u) => ({
					id: u.id,
					shortUrl: u.shortUrl,
					destinationUrl: u.destinationUrl,
					clicks: 0,
					createdAt: new Date(u.createdAt).toLocaleDateString(),
				}));
				setLinks(mapped);
			} catch (err) {
				console.error("[LinksTable] Initial fetch error:", err);
			}
		};

		fetchUrls();

		(async () => {
			try {
				const generator = await orpc.onUrls(undefined, {
					signal: controller.signal,
				});
				for await (const _data of generator) {
					await fetchUrls();
				}
			} catch (err) {
				if (!controller.signal.aborted)
					console.error("[LinksTable] Subscription error:", err);
			}
		})();

		return () => controller.abort();
	}, []);

	return (
		<Card className="relative overflow-hidden border border-white/10 bg-black/55 shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)] backdrop-blur-3xl">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
			<div className="pointer-events-none absolute inset-0 ring-1 ring-white/[0.04] ring-inset" />

			<CardHeader className="relative p-6 md:p-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="space-y-1.5">
						<CardTitle className="font-light text-2xl text-white tracking-tight">
							Your Links
						</CardTitle>
						<CardDescription className="font-light text-white/45">
							Manage and track performance for your shortened URLs.
						</CardDescription>
					</div>

					<div className="relative w-full max-w-sm">
						<Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/40" />
						<Input
							value={q}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setQ(e.target.value)
							}
							placeholder="Search by slug or destination..."
							className="h-12 rounded-xl border-white/10 bg-white/[0.03] pl-11 font-medium text-white placeholder:text-white/35 focus-visible:ring-0"
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent className="relative p-0">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader className="bg-white/[0.03]">
							<TableRow className="border-white/10 hover:bg-transparent">
								<TableHead className="px-8 py-4 font-medium text-white/45 text-xs uppercase tracking-widest">
									Short Link
								</TableHead>
								<TableHead className="py-4 font-medium text-white/45 text-xs uppercase tracking-widest">
									Destination
								</TableHead>
								<TableHead className="py-4 text-center font-medium text-white/45 text-xs uppercase tracking-widest">
									Engagement
								</TableHead>
								<TableHead className="py-4 font-medium text-white/45 text-xs uppercase tracking-widest">
									Date
								</TableHead>
								<TableHead className="w-[80px]" />
							</TableRow>
						</TableHeader>

						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="py-20 text-center">
										<div className="flex flex-col items-center gap-3">
											<div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
												<LinkIcon className="h-6 w-6 text-white/45" />
											</div>
											<div className="font-medium text-lg text-white">
												No links found
											</div>
											<p className="font-light text-white/45">
												Try a different search query or create a new link.
											</p>
										</div>
									</TableCell>
								</TableRow>
							) : (
								filtered.map((l) => {
									const shortFull = baseUrl
										? `${baseUrl.replace(/\/$/, "")}/${l.shortUrl}`
										: `/${l.shortUrl}`;
									return (
										<TableRow
											key={l.id}
											className="group cursor-pointer border-white/10 transition-colors hover:bg-white/[0.02]"
											onClick={() => {
												window.location.href = `/${l.shortUrl}/stats`;
											}}
										>
											<TableCell className="px-8 py-5">
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70">
														<LinkIcon className="h-5 w-5" />
													</div>
													<div className="flex flex-col gap-0.5">
														<span className="font-medium font-mono text-white tracking-tight">
															/{l.shortUrl}
														</span>
														<button
															onClick={(e) => {
																e.stopPropagation();
																onCopy(shortFull);
															}}
															className="flex items-center gap-1.5 text-left font-medium text-white/45 text-xs transition-colors hover:text-white/80"
														>
															<Copy className="h-3 w-3" />
															Copy Link
														</button>
													</div>
												</div>
											</TableCell>

											<TableCell className="py-5">
												<div className="max-w-[300px] lg:max-w-md">
													<div className="truncate font-medium text-white">
														{clampUrl(l.destinationUrl)}
													</div>
													<div className="truncate font-light text-sm text-white/45">
														{l.destinationUrl}
													</div>
												</div>
											</TableCell>

											<TableCell className="py-5 text-center">
												<div className="inline-flex flex-col items-center">
													<div className="flex items-center gap-1.5 font-medium text-lg text-white tabular-nums">
														<BarChart2 className="h-4 w-4 text-white/70" />
														{l.clicks}
													</div>
													<span className="font-medium text-[10px] text-white/45 uppercase tracking-wider">
														Total Clicks
													</span>
												</div>
											</TableCell>

											<TableCell className="py-5">
												<div className="flex items-center gap-2 font-light text-sm text-white/55">
													<Calendar className="h-4 w-4" />
													{l.createdAt}
												</div>
											</TableCell>

											<TableCell className="px-8 py-5 text-right">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															onClick={(e) => e.stopPropagation()}
															className="h-10 w-10 rounded-xl text-white/70 transition-all hover:bg-white/[0.04] hover:text-white group-hover:bg-white/[0.04]"
														>
															<MoreHorizontal className="h-5 w-5" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="w-56 rounded-2xl border-white/10 bg-black/80 p-2 text-white backdrop-blur-xl"
													>
														<DropdownMenuLabel className="px-3 py-2 font-medium text-white/45 text-xs uppercase tracking-widest">
															Manage Link
														</DropdownMenuLabel>
														<DropdownMenuSeparator className="bg-white/10" />
														<DropdownMenuItem
															onClick={() => onCopy(shortFull)}
															className="cursor-pointer rounded-xl p-3 font-medium"
														>
															<Copy className="mr-3 h-4 w-4 text-white/70" />
															Copy Short Link
														</DropdownMenuItem>
														<DropdownMenuItem
															asChild
															className="cursor-pointer rounded-xl p-3 font-medium"
														>
															<Link href={`/${l.shortUrl}/stats` as any}>
																<BarChart2 className="mr-3 h-4 w-4 text-white/70" />
																View Analytics
															</Link>
														</DropdownMenuItem>
														<DropdownMenuSeparator className="bg-white/10" />
														<DropdownMenuItem
															onClick={() =>
																window.open(l.destinationUrl, "_blank")
															}
															className="cursor-pointer rounded-xl p-3 font-medium"
														>
															<ExternalLink className="mr-3 h-4 w-4 text-white/70" />
															Visit Destination
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
