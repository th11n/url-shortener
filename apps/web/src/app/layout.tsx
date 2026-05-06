import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "@url-shortener/ui/globals.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const outfit = Outfit({
	variable: "--font-outfit",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
	title: "Trim.it — Link infrastructure for modern teams",
	description: "Shorten, track and analyze your links with precision.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased bg-background text-foreground`}>
				<Providers>
					<Header />
					{children}
				</Providers>
			</body>
		</html>
	);
}
