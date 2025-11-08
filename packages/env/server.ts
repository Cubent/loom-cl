import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const boolString = (_default = false) =>
	z
		.string()
		.optional()
		.default(_default ? "true" : "false")
		.transform((v) => v === "true")
		.pipe(z.boolean());

function createServerEnv() {
	return createEnv({
		server: {
			/// General configuration
			DATABASE_URL: z.string().describe("PostgreSQL database URL (supports Neon connection strings)"),
			WEB_URL: z
				.string()
				.describe("Public URL of the server eg. https://cap.so"),
			NEXTAUTH_SECRET: z.string().describe("32 byte base64 string"),
			NEXTAUTH_URL: z.string().describe("Should be the same as WEB_URL"),
			DATABASE_ENCRYPTION_KEY: z
				.string()
				.optional()
				.describe(
					"32 byte hex string for encrypting values like AWS access keys",
				),

			// Cap uses Resend for email sending, including sending login code emails
			RESEND_API_KEY: z.string().optional(),
			RESEND_FROM_DOMAIN: z.string().optional(),

			/// Cloudinary configuration
			CLOUDINARY_CLOUD_NAME: z.string().optional().default("").describe("Cloudinary cloud name"),
			CLOUDINARY_API_KEY: z.string().optional().default("").describe("Cloudinary API key"),
			CLOUDINARY_API_SECRET: z.string().optional().default("").describe("Cloudinary API secret"),
			CLOUDINARY_SECURE: boolString(true).describe(
				"Whether to use HTTPS for Cloudinary URLs",
			),

			/// Google Auth
			// Provide these to allow Google login
			GOOGLE_CLIENT_ID: z.string().optional(),
			GOOGLE_CLIENT_SECRET: z.string().optional(),

			/// WorkOS SSO
			// Provide these to use WorkOS for enterprise SSO
			WORKOS_CLIENT_ID: z.string().optional(),
			WORKOS_API_KEY: z.string().optional(),

			/// Settings
			CAP_VIDEOS_DEFAULT_PUBLIC: boolString(true).describe(
				"Should videos be public or private by default",
			),
			CAP_ALLOWED_SIGNUP_DOMAINS: z
				.string()
				.optional()
				.describe("Comma-separated list of permitted signup domains"),

			/// AI providers
			DEEPGRAM_API_KEY: z.string().optional().describe("Audio transcription"),
			OPENAI_API_KEY: z.string().optional().describe("AI summaries"),
			GROQ_API_KEY: z.string().optional().describe("AI summaries"),

			/// Cap Cloud
			// These are only needed for Cap Cloud (https://cap.so)
			STRIPE_SECRET_KEY: z.string().optional(),
			STRIPE_WEBHOOK_SECRET: z.string().optional(),
			DISCORD_FEEDBACK_WEBHOOK_URL: z.string().optional(),
			DISCORD_LOGS_WEBHOOK_URL: z.string().optional(),
			VERCEL_ENV: z
				.union([
					z.literal("production"),
					z.literal("preview"),
					z.literal("development"),
				])
				.optional(),
			VERCEL_TEAM_ID: z.string().optional(),
			VERCEL_PROJECT_ID: z.string().optional(),
			VERCEL_AUTH_TOKEN: z.string().optional(),
			VERCEL_URL_HOST: z.string().optional(),
			VERCEL_BRANCH_URL_HOST: z.string().optional(),
			VERCEL_PROJECT_PRODUCTION_URL_HOST: z.string().optional(),
			VERCEL_AWS_ROLE_ARN: z.string().optional(),
			POSTHOG_PERSONAL_API_KEY: z.string().optional(),
			DUB_API_KEY: z.string().optional(),
			INTERCOM_SECRET: z.string().optional(),

			/// Ignore
			NODE_ENV: z.string(),
			WORKFLOWS_RPC_URL: z.string().optional(),
			WORKFLOWS_RPC_SECRET: z.string().optional(),
		},
		experimental__runtimeEnv: {
			S3_PUBLIC_ENDPOINT: process.env.CAP_AWS_ENDPOINT,
			S3_INTERNAL_ENDPOINT: process.env.CAP_AWS_ENDPOINT,
			...process.env,
			NODE_ENV: process.env.NODE_ENV ?? "production",
			VERCEL_URL_HOST: process.env.VERCEL_URL,
			VERCEL_BRANCH_URL_HOST: process.env.VERCEL_BRANCH_URL,
			VERCEL_PROJECT_PRODUCTION_URL_HOST:
				process.env.VERCEL_PROJECT_PRODUCTION_URL,
		},
	});
}

let _cached: ReturnType<typeof createServerEnv> | undefined;
export const serverEnv = () => {
	if (_cached) return _cached;
	_cached = createServerEnv();
	return _cached;
};
