"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";

// Floating glass pill — renders above all page content
export default function Header() {
	const { data: session } = authClient.useSession();
	const pathname = usePathname();
	if (pathname !== "/") return null;

	return (
		<div className="pointer-events-none fixed top-5 left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 px-4">
			<motion.header
				initial={{ y: -10, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
				className="pointer-events-auto relative flex items-center justify-between overflow-hidden rounded-full border border-white/12 bg-black/40 px-4 py-2 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
			>
				<div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.03]" />

				{/* Logo */}
				<Link href="/" className="relative flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]">
					<span className="font-outfit text-[15px] font-medium tracking-tight text-white">trim.it</span>
				</Link>

				<div className="relative shrink-0 pl-1">
					{session?.user ? (
						<Link
							href="/dashboard"
							className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
								pathname.startsWith("/dashboard")
									? "bg-white/[0.08] text-white"
									: "text-white/60 hover:bg-white/[0.03] hover:text-white/80"
							}`}
						>
							Dashboard
						</Link>
					) : (
						<Link
							href="/login"
							className="rounded-full border border-white/20 bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-colors hover:border-white/30 hover:bg-white/95"
						>
							Sign in
						</Link>
					)}
				</div>
			</motion.header>
		</div>
	);
}
