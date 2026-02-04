"use client";

import { useForm } from "@tanstack/react-form";
// TWOJE IMPORTY
import { Button } from "@url-shortener/ui/components/button";
import { Input } from "@url-shortener/ui/components/input";
import { Label } from "@url-shortener/ui/components/label";
import { ArrowRight, Link2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const router = useRouter();
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Welcome back!");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.string().email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) return <Loader />;

	return (
		<div className="absolute top-1/2 left-1/2 mx-auto h-min w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card/50 p-6 shadow-2xl backdrop-blur-sm transition-all">
			<div className="mb-8 flex flex-col items-center text-center">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Link2 className="h-6 w-6 text-primary" />
				</div>
				<h1 className="font-bold text-3xl text-foreground tracking-tighter">
					Welcome Back
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Enter your credentials to access your dashboard
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-5"
			>
				{/* EMAIL FIELD */}
				<form.Field name="email">
					{(field) => (
						<div className="space-y-2">
							<Label
								htmlFor={field.name}
								className="font-bold text-xs uppercase tracking-widest opacity-70"
							>
								Email Address
							</Label>
							<div className="relative">
								<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id={field.name}
									name={field.name}
									type="email"
									placeholder="name@example.com"
									className="border-border bg-background/50 pl-10 focus-visible:ring-primary/20"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
								/>
							</div>
							{field.state.meta.errors.map((error) => (
								<p
									key={error?.message}
									className="fade-in slide-in-from-top-1 animate-in font-medium text-[12px] text-destructive"
								>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				{/* PASSWORD FIELD */}
				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label
									htmlFor={field.name}
									className="font-bold text-xs uppercase tracking-widest opacity-70"
								>
									Password
								</Label>
								<button
									type="button"
									className="font-semibold text-[11px] text-primary/80 transition-colors hover:text-primary"
								>
									Forgot password?
								</button>
							</div>
							<div className="relative">
								<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id={field.name}
									name={field.name}
									type="password"
									placeholder="••••••••"
									className="border-border bg-background/50 pl-10 focus-visible:ring-primary/20"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
								/>
							</div>
							{field.state.meta.errors.map((error) => (
								<p
									key={error?.message}
									className="fade-in slide-in-from-top-1 animate-in font-medium text-[12px] text-destructive"
								>
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
							className="mt-2 h-11 w-full font-semibold transition-all active:scale-[0.98]"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? (
								"Authenticating..."
							) : (
								<span className="flex items-center justify-center gap-2">
									Sign In <ArrowRight className="h-4 w-4" />
								</span>
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-6 border-border/50 border-t pt-6 text-center">
				<p className="text-muted-foreground text-sm">
					Don't have an account?{" "}
					<button
						type="button"
						onClick={onSwitchToSignUp}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						Create an account
					</button>
				</p>
			</div>
		</div>
	);
}
