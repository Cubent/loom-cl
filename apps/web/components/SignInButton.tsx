"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { Button } from "~/app/(org)/studio/[videoId]/_components/ui";

export function SignInButton({
	children,
	className,
	...props
}: {
	children?: ReactNode;
	className?: string;
	[key: string]: any;
}) {
	const router = useRouter();

	const handleSignIn = () => {
		// Get current path for callback URL
		const currentPath = window.location.pathname;
		const callbackUrl = encodeURIComponent(currentPath);
		router.push(`/login?callbackUrl=${callbackUrl}`);
	};

	return (
		<Button
			className={className}
			variant="primary"
			onClick={handleSignIn}
			{...props}
		>
			{children ?? "Sign In"}
		</Button>
	);
}

