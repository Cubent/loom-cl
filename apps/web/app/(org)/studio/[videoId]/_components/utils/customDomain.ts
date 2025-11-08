"use client";

import { useQuery } from "@tanstack/react-query";

export type CustomDomainResponse = {
	custom_domain: string | null;
	domain_verified: boolean | null;
};

export function useCustomDomainQuery() {
	return useQuery<CustomDomainResponse>({
		queryKey: ["customDomain"],
		queryFn: async () => {
			try {
				const response = await fetch("/api/video/domain-info");
				if (response.ok) {
					return await response.json();
				}
			} catch (error) {
				console.error("Error fetching custom domain:", error);
			}
			return { custom_domain: null, domain_verified: null };
		},
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});
}

