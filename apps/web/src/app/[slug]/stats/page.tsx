"use client";

import { Badge } from "@url-shortener/ui/components/badge";
import { Button } from "@url-shortener/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@url-shortener/ui/components/card";
import { motion } from "framer-motion";
import {
	Activity,
	ArrowLeft,
	Chrome,
	Clock,
	Globe,
	MousePointer2,
	Smartphone,
	Users,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import Loader from "@/components/loader";
import MagicRings from "@/components/rings";
import { StripedPattern } from "@/components/strips";
import { analyticsOrpc } from "@/lib/orpc-client";

export default function LinkStatsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = use(params);
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const res = await analyticsOrpc.getLinkAnalytics({
					id: slug,
					days: 30,
				});
				setData(res);
			} catch (err: any) {
				console.error(err);
				setError(
					err.message ||
						"Failed to load analytics. You might need to be logged in.",
				);
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, [slug]);

	if (loading) {
		return (
			<div className="relative min-h-screen bg-background selection:bg-primary/20 selection:text-primary before:pointer-events-none before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-full before:bg-[url('https://www.ui-layouts.com/noise.gif')] before:opacity-[0.02] before:content-['']">
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
					<Loader fullScreen label="Analyzing link data..." />
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
				<div className="mb-6 rounded-3xl bg-destructive/10 p-6 text-destructive">
					<Activity className="h-12 w-12" />
				</div>
				<h1 className="font-bold text-3xl tracking-tight">Access Denied</h1>
				<p className="mt-2 max-w-md font-medium text-muted-foreground">
					{error ||
						"We couldn't find analytics for this link or you don't have permission to view them."}
				</p>
				<Button asChild className="mt-8 rounded-2xl px-8" size="lg">
					<Link href="/dashboard">Back to Dashboard</Link>
				</Button>
			</div>
		);
	}

	const { metrics, timeseries, topCountries, devices, browsers, link } = data;
	const glassCard =
		"border border-white/10 bg-black/55 backdrop-blur-3xl shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)]";
	const chartClicksColor = "oklch(var(--primary))";
	const chartVisitorsColor = "#60a5fa";
	const totalClicks = Math.max(1, Number(metrics.totalClicks || 0));

	return (
		<div className="relative min-h-screen bg-background p-4 selection:bg-primary/20 selection:text-primary before:pointer-events-none before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-full before:bg-[url('https://www.ui-layouts.com/noise.gif')] before:opacity-[0.02] before:content-[''] md:p-8">
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

			<div className="relative z-20 mx-auto max-w-7xl space-y-10">
				{/* Navigation & Title */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
				>
					<div className="space-y-4">
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 font-medium text-sm text-white/55 transition-colors hover:text-white/85"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</Link>
						<div className="space-y-1">
							<div className="flex items-center gap-3">
								<h1 className="font-light text-4xl text-white tracking-tight md:text-5xl">
									Link Analytics
								</h1>
								<Badge
									variant="outline"
									className="h-7 border-white/15 bg-white/[0.03] text-white/80"
								>
									/{slug}
								</Badge>
							</div>
							<p className="max-w-2xl truncate font-light text-white/45">
								Tracking performance for:{" "}
								<span className="text-white/80">{link.destinationUrl}</span>
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							className="rounded-full border-white/15 bg-transparent font-medium text-white/80"
						>
							Last 30 Days
						</Button>
						<Button className="rounded-full border border-white/10 bg-white font-medium text-black hover:bg-white/90">
							Download Report
						</Button>
					</div>
				</motion.div>

				{/* Primary Stats */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{[
						{
							label: "Total Clicks",
							value: metrics.totalClicks,
							icon: MousePointer2,
							color: "text-primary",
						},
						{
							label: "Unique Visitors",
							value: metrics.uniqueVisitors,
							icon: Users,
							color: "text-blue-500",
						},
						{
							label: "Avg. Daily",
							value: (metrics.totalClicks / 30).toFixed(1),
							icon: Activity,
							color: "text-emerald-500",
						},
					].map((stat, i) => (
						<motion.div
							key={stat.label}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.1 }}
						>
							<Card className={glassCard}>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="font-medium text-sm text-white/45 uppercase tracking-widest">
										{stat.label}
									</CardTitle>
									<stat.icon className={`h-5 w-5 ${stat.color}`} />
								</CardHeader>
								<CardContent>
									<div className="font-light text-4xl text-white tracking-tight">
										{stat.value}
									</div>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</div>

				{/* Main Chart */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
				>
					<Card className={glassCard}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="font-light text-white text-xl tracking-tight">
										Click Activity
									</CardTitle>
									<CardDescription className="font-light text-white/45">
										Engagement trend over the last 30 days
									</CardDescription>
								</div>
								<div className="flex items-center gap-4 font-medium text-white/45 text-xs uppercase tracking-widest">
									<div className="flex items-center gap-1.5">
										<div className="h-2 w-2 rounded-full bg-primary" />
										Clicks
									</div>
									<div className="flex items-center gap-1.5">
										<div className="h-2 w-2 rounded-full bg-blue-500" />
										Visitors
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="h-[400px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={timeseries}>
										<defs>
											<linearGradient
												id="colorClicks"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor={chartClicksColor}
													stopOpacity={0.35}
												/>
												<stop
													offset="95%"
													stopColor={chartClicksColor}
													stopOpacity={0}
												/>
											</linearGradient>
											<linearGradient
												id="colorVisitors"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor={chartVisitorsColor}
													stopOpacity={0.35}
												/>
												<stop
													offset="95%"
													stopColor={chartVisitorsColor}
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="rgba(255,255,255,0.08)"
										/>
										<XAxis
											dataKey="day"
											axisLine={false}
											tickLine={false}
											tick={{
												fill: "rgba(255,255,255,0.5)",
												fontSize: 12,
												fontWeight: 500,
											}}
											tickFormatter={(str) =>
												new Date(str).toLocaleDateString(undefined, {
													day: "numeric",
													month: "short",
												})
											}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{
												fill: "rgba(255,255,255,0.5)",
												fontSize: 12,
												fontWeight: 500,
											}}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "rgba(5,5,5,0.88)",
												borderColor: "rgba(255,255,255,0.15)",
												borderRadius: "16px",
												boxShadow: "0 20px 30px -10px rgba(0,0,0,0.6)",
												padding: "12px 16px",
											}}
											itemStyle={{
												fontWeight: 600,
												fontSize: "13px",
												color: "rgba(255,255,255,0.9)",
											}}
											labelStyle={{
												marginBottom: "4px",
												fontWeight: 500,
												color: "rgba(255,255,255,0.6)",
											}}
											labelFormatter={(str) =>
												new Date(str).toLocaleDateString(undefined, {
													dateStyle: "full",
												})
											}
										/>
										<Area
											type="monotone"
											dataKey="clicks"
											stroke={chartClicksColor}
											strokeWidth={2.5}
											fillOpacity={1}
											fill="url(#colorClicks)"
										/>
										<Area
											type="monotone"
											dataKey="visitors"
											stroke={chartVisitorsColor}
											strokeWidth={2.5}
											fillOpacity={1}
											fill="url(#colorVisitors)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Breakdown Grids */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{/* Top Countries */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<Card className={`h-full ${glassCard}`}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 font-light text-lg text-white">
									<Globe className="h-5 w-5 text-blue-500" />
									Top Locations
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{topCountries.map((c: any) => (
									<div key={c.country} className="space-y-1.5">
										<div className="flex items-center justify-between font-medium text-sm text-white/85">
											<span>{c.country}</span>
											<span className="text-primary tabular-nums">
												{c.count}
											</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${(c.count / totalClicks) * 100}%` }}
												transition={{ duration: 1, ease: "easeOut" }}
												className="h-full bg-blue-500"
											/>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</motion.div>

					{/* Devices */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
					>
						<Card className={`h-full ${glassCard}`}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 font-light text-lg text-white">
									<Smartphone className="h-5 w-5 text-primary" />
									Device Distribution
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{devices.map((d: any) => (
									<div key={d.device} className="space-y-1.5">
										<div className="flex items-center justify-between font-medium text-sm text-white/85">
											<span className="capitalize">{d.device}</span>
											<span className="text-primary tabular-nums">
												{d.count}
											</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${(d.count / totalClicks) * 100}%` }}
												transition={{ duration: 1, ease: "easeOut" }}
												className="h-full bg-primary"
											/>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</motion.div>

					{/* Browsers */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
					>
						<Card className={`h-full ${glassCard}`}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 font-light text-lg text-white">
									<Chrome className="h-5 w-5 text-amber-500" />
									Top Browsers
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{browsers.map((b: any) => (
									<div key={b.browser} className="space-y-1.5">
										<div className="flex items-center justify-between font-medium text-sm text-white/85">
											<span>{b.browser}</span>
											<span className="text-primary tabular-nums">
												{b.count}
											</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${(b.count / totalClicks) * 100}%` }}
												transition={{ duration: 1, ease: "easeOut" }}
												className="h-full bg-amber-500"
											/>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
