"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-border border-b bg-background/80 backdrop-blur-md">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				{/* Logo Section */}
				<div className="flex items-center gap-8">
					<Link
						href="/"
						className="flex items-center gap-2 transition-opacity hover:opacity-90"
					>
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
							<Link2 className="h-5 w-5 text-primary-foreground" />
						</div>
						<span className="font-bold text-xl uppercase tracking-tighter">
							Trim<span className="text-muted-foreground">.it</span>
						</span>
					</Link>
				</div>

				{/* Action Section */}
				<div className="flex items-center gap-4">
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
