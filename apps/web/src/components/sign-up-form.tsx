"use client";

import { useForm } from "@tanstack/react-form";
// TWOJE IMPORTY
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
		<div className="absolute top-1/2 left-1/2 mx-auto h-min w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card/50 p-6 shadow-2xl backdrop-blur-sm transition-all">
			<div className="mb-8 flex flex-col items-center">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Link2 className="h-6 w-6 text-primary" />
				</div>
				<h1 className="font-bold text-3xl tracking-tighter">Create Account</h1>
				<p className="text-muted-foreground text-sm">
					Join the next generation of link management
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
				<form.Field name="name">
					{(field) => (
						<div className="space-y-2">
							<Label
								htmlFor={field.name}
								className="font-bold text-xs uppercase tracking-widest opacity-70"
							>
								Full Name
							</Label>
							<div className="relative">
								<User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id={field.name}
									name={field.name}
									placeholder="John Doe"
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

				<form.Field name="email">
					{(field) => (
						<div className="space-y-2">
							<Label
								htmlFor={field.name}
								className="font-bold text-xs uppercase tracking-widest opacity-70"
							>
								Email
							</Label>
							<div className="relative">
								<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id={field.name}
									name={field.name}
									type="email"
									placeholder="you@example.com"
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

				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<Label
								htmlFor={field.name}
								className="font-bold text-xs uppercase tracking-widest opacity-70"
							>
								Password
							</Label>
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
							className="h-11 w-full font-semibold transition-all active:scale-[0.98]"
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

			<div className="mt-6 border-border/50 border-t pt-6 text-center">
				<p className="text-muted-foreground text-sm">
					Already have an account?{" "}
					<button
						type="button"
						onClick={onSwitchToSignIn}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						Sign In
					</button>
				</p>
			</div>
		</div>
	);
}
