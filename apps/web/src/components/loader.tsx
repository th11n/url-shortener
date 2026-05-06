import { Loader2 } from "lucide-react";

export default function Loader({
	label = "Loading...",
	fullScreen = false,
}: {
	label?: string;
	fullScreen?: boolean;
}) {
	return (
		<div className={`${fullScreen ? "min-h-screen" : "h-full pt-8"} flex items-center justify-center`}>
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
					<Loader2 className="h-5 w-5 animate-spin text-white/75" />
				</div>
				<p className="text-sm font-light text-white/55">{label}</p>
			</div>
		</div>
	);
}
