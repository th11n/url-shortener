"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@url-shortener/ui/components/button";
import { Input } from "@url-shortener/ui/components/input";
import { Label } from "@url-shortener/ui/components/label";
import { ArrowRight, Link2, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const router = useRouter();
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Sign up successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.string().email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) return <Loader />;

	return (
		<div className="absolute top-1/2 left-1/2 mx-auto h-min w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black/55 p-8 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-3xl transition-all">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
			<div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />

			<div className="relative">
				<div className="mb-8 flex flex-col items-center text-center">
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
						<Link2 className="h-5 w-5 text-white/75" />
					</div>
					<h1 className="font-light text-3xl text-white tracking-tight">Create Account</h1>
					<p className="mt-2 text-sm font-light text-white/45">Join the next generation of link management</p>
				</div>

				<form
					onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-5"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name} className="font-bold text-xs uppercase tracking-widest text-white/55">
									Full Name
								</Label>
								<div className="relative">
									<User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
									<Input
										id={field.name}
										name={field.name}
										placeholder="John Doe"
										className="h-11 border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/35 focus-visible:ring-0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
									/>
								</div>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="animate-in slide-in-from-top-1 fade-in font-medium text-[12px] text-destructive">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name} className="font-bold text-xs uppercase tracking-widest text-white/55">
									Email
								</Label>
								<div className="relative">
									<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
									<Input
										id={field.name}
										name={field.name}
										type="email"
										placeholder="you@example.com"
										className="h-11 border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/35 focus-visible:ring-0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
									/>
								</div>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="animate-in slide-in-from-top-1 fade-in font-medium text-[12px] text-destructive">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name} className="font-bold text-xs uppercase tracking-widest text-white/55">
									Password
								</Label>
								<div className="relative">
									<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
									<Input
										id={field.name}
										name={field.name}
										type="password"
										placeholder="********"
										className="h-11 border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/35 focus-visible:ring-0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
									/>
								</div>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="animate-in slide-in-from-top-1 fade-in font-medium text-[12px] text-destructive">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Subscribe>
						{(state) => (
							<Button
								type="submit"
								className="h-12 w-full rounded-full border border-white/10 bg-white font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
								disabled={!state.canSubmit || state.isSubmitting}
							>
								{state.isSubmitting ? (
									"Creating account..."
								) : (
									<span className="flex items-center justify-center gap-2">
										Create Account <ArrowRight className="h-4 w-4" />
									</span>
								)}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<div className="mt-6 border-t border-white/10 pt-6 text-center">
					<p className="text-sm text-white/45">
						Already have an account?{" "}
						<button type="button" onClick={onSwitchToSignIn} className="font-medium text-white/80 underline-offset-4 hover:underline">
							Sign In
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
