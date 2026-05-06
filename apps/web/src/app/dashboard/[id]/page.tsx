"use client";

import { Button } from "@url-shortener/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@url-shortener/ui/components/card";
import { Separator } from "@url-shortener/ui/components/separator";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Copy,
	ExternalLink,
	Globe,
	MousePointer2,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { analyticsOrpc } from "@/lib/orpc-client";

const CHART = {
	primary: "hsl(var(--primary))",
	mutedFg: "hsl(var(--muted-foreground))",
	border: "hsl(var(--border))",
	card: "hsl(var(--card))",
};

const DEVICE_COLORS: Record<string, string> = {
	desktop: "hsl(var(--chart-1, var(--primary)))",
	mobile: "hsl(var(--chart-2, 142 71% 45%))",
	tablet: "hsl(var(--chart-3, 38 92% 50%))",
	bot: "hsl(var(--destructive))",
	unknown: "hsl(var(--muted-foreground))",
};

interface AnalyticsData {
	link: {
		shortUrl: string;
		destinationUrl: string;
		createdAt: string | number | Date;
	};
	metrics: {
		totalClicks: number;
		uniqueVisitors: number;
		avgHourly: number;
	};
	timeseries: Array<{ day: string; clicks: number; visitors: number }>;
	topCountries: Array<{ country: string | null; count: number }>;
	devices: Array<{ device: string; count: number }>;
	browsers: Array<{ browser: string | null; count: number }>;
}

interface ChartTooltipProps {
	active?: boolean;
	payload?: Array<{
		name?: string;
		dataKey?: string | number;
		value: number;
		color?: string;
	}>;
	label?: string | number;
	labelFormatter?: (label: string | number) => React.ReactNode;
}

function ChartTooltip({
	active,
	payload,
	label,
	labelFormatter,
}: ChartTooltipProps) {
	if (!active || !payload?.length) return null;
	const shownLabel =
		labelFormatter && label != null ? labelFormatter(label) : label;

	return (
		<div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
			{shownLabel != null && (
				<div className="mb-1 text-muted-foreground text-xs">
					{String(shownLabel)}
				</div>
			)}
			<div className="space-y-1">
				{payload.map((p, idx) => (
					<div
						key={`${p.dataKey ?? p.name ?? "k"}-${idx}`}
						className="flex items-center justify-between gap-6"
					>
						<div className="flex items-center gap-2">
							<span
								className="h-2 w-2 rounded-full"
								style={{ background: p.color }}
							/>
							<span className="text-muted-foreground">
								{p.name ?? p.dataKey}
							</span>
						</div>
						<span className="font-medium tabular-nums">
							{typeof p.value === "number"
								? p.value.toLocaleString()
								: String(p.value)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function hashToPercent(str: string, seed = 0) {
	let h = seed >>> 0;
	for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
	return (h % 1000) / 10; // 0..100
}

export default function AnalysisPage({
	params: paramsPromise,
}: {
	params: Promise<{ id: string }>;
}) {
	const params = use(paramsPromise);
	const id = params.id;

	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchAnalytics = useCallback(async () => {
		try {
			const res = await analyticsOrpc.getLinkAnalytics({ id, days: 30 });
			setData(res as unknown as AnalyticsData);
		} catch (err) {
			console.error("[AnalysisPage] fetch error:", err);
			toast.error("Failed to load analytics");
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		setLoading(true);
		fetchAnalytics();

		const controller = new AbortController();
		(async () => {
			try {
				const generator = await analyticsOrpc.onLinkAnalytics(
					{ id },
					{ signal: controller.signal },
				);

				interface UpdateEvent {
					type: "click_added" | "subscription_ready" | "heartbeat";
					at?: number;
				}

				for await (const update of generator as AsyncIterable<UpdateEvent>) {
					if (update?.type === "subscription_ready") continue;
					if (update?.type === "heartbeat") continue;
					fetchAnalytics();
				}
			} catch (err) {
				if (!controller.signal.aborted) {
					console.error("[AnalysisPage] SUBSCRIPTION ERROR:", err);
				}
			}
		})();

		return () => controller.abort();
	}, [id, fetchAnalytics]);

	// ✅ SAFE DEFAULTS (so hooks below always run)
	const link = data?.link ?? {
		shortUrl: "",
		destinationUrl: "",
		createdAt: Date.now(),
	};
	const metrics = data?.metrics ?? {
		totalClicks: 0,
		uniqueVisitors: 0,
		avgHourly: 0,
	};
	const timeseries: any[] = Array.isArray(data?.timeseries)
		? data.timeseries
		: [];
	const topCountries: any[] = Array.isArray(data?.topCountries)
		? data.topCountries
		: [];
	const devices: any[] = Array.isArray(data?.devices) ? data.devices : [];
	const browsers: any[] = Array.isArray(data?.browsers) ? data.browsers : [];

	// ✅ HOOKS ALWAYS CALLED (no early return before them)
	const deviceChartData = useMemo(() => {
		const arr = devices.map((d) => {
			const device = String(d.device ?? "unknown");
			const name = device.charAt(0).toUpperCase() + device.slice(1);
			return {
				name,
				value: Number(d.count ?? 0),
				color: DEVICE_COLORS[device] || DEVICE_COLORS.unknown,
			};
		});
		arr.sort((a, b) => b.value - a.value);
		return arr;
	}, [devices]);

	const totalDeviceClicks = useMemo(
		() => deviceChartData.reduce((a, d) => a + (d.value ?? 0), 0),
		[deviceChartData],
	);

	const hasTimeseries = timeseries.length > 0;
	const hasBrowsers = browsers.length > 0;
	const hasCountries = topCountries.length > 0;
	const hasDevices = totalDeviceClicks > 0;

	// ✅ early return AFTER hooks
	if (loading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="animate-pulse text-muted-foreground">
					Loading analysis...
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6 lg:p-10">
			{/* Header */}
			<div className="flex flex-col gap-4">
				<Link
					href="/dashboard"
					className="flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-primary"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</Link>

				<div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
					<div>
						<h1 className="font-bold text-3xl tracking-tight">Link Analysis</h1>
						<p className="mt-1 text-muted-foreground">
							Detailed insights for{" "}
							<span className="font-medium text-foreground">
								{link.shortUrl}
							</span>
						</p>
					</div>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={() => {
								navigator.clipboard.writeText(
									`${window.location.origin}/${link.shortUrl}`,
								);
								toast.success("Copied to clipboard");
							}}
						>
							<Copy className="h-4 w-4" />
							Copy Link
						</Button>

						<Button
							size="sm"
							className="gap-2"
							onClick={() => window.open(link.destinationUrl, "_blank")}
						>
							<ExternalLink className="h-4 w-4" />
							Visit URL
						</Button>
					</div>
				</div>
			</div>

			<Separator />

			{/* Stats Overview */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="bg-gradient-to-br from-card to-secondary/20">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Total Clicks</CardTitle>
						<MousePointer2 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{metrics.totalClicks.toLocaleString()}
						</div>
						<p className="mt-1 text-muted-foreground text-xs">Last 30 days</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Unique Visitors
						</CardTitle>
						<Globe className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{metrics.uniqueVisitors.toLocaleString()}
						</div>
						<p className="mt-1 text-muted-foreground text-xs">
							Based on unique IPs
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Avg. Hourly</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{(metrics.avgHourly || 0).toFixed(1)}
						</div>
						<p className="mt-1 text-muted-foreground text-xs">
							Clicks per hour
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Created On</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{new Date(link.createdAt).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
							})}
						</div>
						<p className="mt-1 text-muted-foreground text-xs">
							Destination: {new URL(link.destinationUrl).hostname}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Charts Row */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Activity Trend</CardTitle>
						<CardDescription>
							Clicks recorded over the selected period
						</CardDescription>
					</CardHeader>
					<CardContent className="h-[300px] w-full pt-4">
						{!hasTimeseries ? (
							<div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
								No activity yet
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={timeseries}
									margin={{ top: 8, right: 12, left: -6, bottom: 0 }}
								>
									<defs>
										<linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor={CHART.primary}
												stopOpacity={0.35}
											/>
											<stop
												offset="95%"
												stopColor={CHART.primary}
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>

									<CartesianGrid
										strokeDasharray="4 4"
										vertical={false}
										stroke={CHART.border}
									/>

									<XAxis
										dataKey="day"
										stroke={CHART.mutedFg}
										fontSize={12}
										tickLine={false}
										axisLine={false}
										minTickGap={24}
										tickFormatter={(val) =>
											new Date(val).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											})
										}
									/>

									<YAxis
										stroke={CHART.mutedFg}
										fontSize={12}
										tickLine={false}
										axisLine={false}
										width={32}
										allowDecimals={false}
									/>

									<Tooltip
										content={<ChartTooltip />}
										labelFormatter={(val) =>
											new Date(val).toLocaleDateString("en-US", {
												weekday: "short",
												month: "short",
												day: "numeric",
											})
										}
									/>

									<Area
										name="Clicks"
										type="monotone"
										dataKey="clicks"
										stroke={CHART.primary}
										strokeWidth={2}
										fill="url(#clicksFill)"
										dot={false}
										activeDot={{ r: 4 }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Devices</CardTitle>
						<CardDescription>Clicks by device type</CardDescription>
					</CardHeader>
					<CardContent className="flex h-[300px] flex-col items-center justify-center">
						{!hasDevices ? (
							<div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
								No device data yet
							</div>
						) : (
							<>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={deviceChartData}
											cx="50%"
											cy="50%"
											innerRadius={62}
											outerRadius={84}
											paddingAngle={3}
											dataKey="value"
											stroke={CHART.card}
											strokeWidth={2}
										>
											{deviceChartData.map((entry) => (
												<Cell key={`cell-${entry.name}`} fill={entry.color} />
											))}
										</Pie>

										<text
											x="50%"
											y="48%"
											textAnchor="middle"
											dominantBaseline="middle"
											className="fill-foreground"
										>
											<tspan className="font-semibold text-xl">
												{totalDeviceClicks.toLocaleString()}
											</tspan>
										</text>
										<text
											x="50%"
											y="58%"
											textAnchor="middle"
											dominantBaseline="middle"
											className="fill-muted-foreground"
										>
											<tspan className="text-xs">clicks</tspan>
										</text>

										<Tooltip content={<ChartTooltip />} />
									</PieChart>
								</ResponsiveContainer>

								<div className="mt-4 flex w-full flex-wrap justify-center gap-4">
									{deviceChartData.map((device) => (
										<div
											key={device.name}
											className="flex items-center gap-1.5"
										>
											<div
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: device.color }}
											/>
											<span className="font-medium text-xs">{device.name}</span>
										</div>
									))}
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Geo Locations</CardTitle>
						<CardDescription>
							Where your audience is coming from
						</CardDescription>
					</CardHeader>

					<CardContent>
						<div className="flex flex-col gap-6">
							<div className="group relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-slate-950/5">
								<div className="absolute inset-0 opacity-[0.08] transition-opacity group-hover:opacity-20 dark:opacity-[0.15]">
									<svg
										viewBox="0 0 1000 500"
										className="h-full w-full fill-foreground"
										aria-labelledby="geo-map-title"
									>
										<title id="geo-map-title">
											Global Traffic Distribution Map
										</title>
										<path
											d="M150,150 Q200,100 250,150 T350,150 T450,200 T350,250 T200,200 Z"
											opacity="0.8"
										/>
										<path
											d="M600,100 Q650,50 700,100 T800,150 T750,250 T650,200 T600,150 Z"
											opacity="0.6"
										/>
										<path
											d="M400,300 Q450,250 500,300 T600,350 T500,450 T400,400 T400,350 Z"
											opacity="0.7"
										/>
										<path
											d="M750,350 Q800,300 850,350 T950,400 T850,480 T750,450 T750,400 Z"
											opacity="0.5"
										/>
										<circle cx="200" cy="350" r="40" opacity="0.4" />
										<circle cx="850" cy="100" r="30" opacity="0.3" />
									</svg>
								</div>

								{topCountries.map((c, i) => {
									const key = c.country || `unk-${i}`;
									const top = 15 + hashToPercent(key, 1) * 0.7;
									const left = 15 + hashToPercent(key, 2) * 0.7;
									return (
										<div
											key={key}
											className="absolute h-2 w-2 rounded-full bg-primary"
											style={{ top: `${top}%`, left: `${left}%` }}
										>
											<div
												className="absolute inset-0 animate-ping rounded-full bg-primary/40"
												style={{ animationDelay: `${i * 0.4}s` }}
											/>
										</div>
									);
								})}

								<div className="z-10 px-6 text-center">
									<div className="mb-3 flex justify-center">
										<div className="rounded-2xl border border-border bg-background p-3 shadow-primary/5 shadow-xl">
											<Globe className="h-8 w-8 text-primary" />
										</div>
									</div>
									<p className="font-semibold text-sm">
										Global Traffic Distribution
									</p>
									<p className="mt-1 max-w-[200px] text-muted-foreground text-xs">
										Real-time geolocation of incoming link requests
									</p>
								</div>
							</div>

							<div className="space-y-4">
								{!hasCountries && (
									<div className="py-4 text-center text-muted-foreground text-sm italic">
										No location data yet
									</div>
								)}
								{topCountries.map((loc) => (
									<div
										key={loc.country ?? `unknown-${loc.count}`}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-4 w-6 items-center justify-center rounded bg-muted font-bold text-[10px]">
												{loc.country || "??"}
											</div>
											<span className="font-medium text-sm">
												{loc.country || "Unknown"}
											</span>
										</div>
										<div className="flex max-w-[170px] flex-1 items-center gap-4">
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
												<div
													className="h-full bg-primary"
													style={{
														width: `${(loc.count / ((topCountries?.[0]?.count as number) || 1)) * 100}%`,
													}}
												/>
											</div>
											<span className="w-10 text-right text-sm tabular-nums">
												{Number(loc.count || 0).toLocaleString()}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Browsers</CardTitle>
						<CardDescription>
							Most used browsers by your visitors
						</CardDescription>
					</CardHeader>

					<CardContent className="h-[350px] pt-4">
						{!hasBrowsers ? (
							<div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
								No browser data yet
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={browsers}
									layout="vertical"
									margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
									barCategoryGap={10}
								>
									<CartesianGrid
										strokeDasharray="4 4"
										horizontal={false}
										stroke={CHART.border}
									/>
									<XAxis
										type="number"
										stroke={CHART.mutedFg}
										fontSize={12}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<YAxis
										dataKey="browser"
										type="category"
										stroke={CHART.mutedFg}
										fontSize={12}
										tickLine={false}
										axisLine={false}
										width={88}
									/>
									<Tooltip content={<ChartTooltip />} />
									<Bar
										name="Clicks"
										dataKey="count"
										fill={CHART.primary}
										radius={[4, 4, 4, 4]}
										barSize={18}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
