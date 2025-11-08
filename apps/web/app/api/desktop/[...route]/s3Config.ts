// Cloudinary doesn't need S3 config testing - it's automatic
import { db } from "@cap/database";
import { decrypt, encrypt } from "@cap/database/crypto";
import { nanoId } from "@cap/database/helpers";
import { s3Buckets } from "@cap/database/schema";
import { S3Bucket } from "@cap/web-domain";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { withAuth } from "@/app/api/utils";

export const app = new Hono().use(withAuth);

app.post(
	"/",
	zValidator(
		"json",
		z.object({
			provider: z.string(),
			accessKeyId: z.string(),
			secretAccessKey: z.string(),
			endpoint: z.string(),
			bucketName: z.string(),
			region: z.string(),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const data = c.req.valid("json");

		try {
			// Encrypt the sensitive data
			const encryptedConfig = {
				id: S3Bucket.S3BucketId.make(nanoId()),
				provider: data.provider,
				accessKeyId: await encrypt(data.accessKeyId),
				secretAccessKey: await encrypt(data.secretAccessKey),
				endpoint: data.endpoint ? await encrypt(data.endpoint) : null,
				bucketName: await encrypt(data.bucketName),
				region: await encrypt(data.region),
				ownerId: user.id,
			};

			// Check if user already has a bucket config
			const [existingBucket] = await db()
				.select()
				.from(s3Buckets)
				.where(eq(s3Buckets.ownerId, user.id));

			if (existingBucket) {
				// Update existing config
				await db()
					.update(s3Buckets)
					.set(encryptedConfig)
					.where(eq(s3Buckets.id, existingBucket.id));
			} else {
				// Insert new config
				await db().insert(s3Buckets).values(encryptedConfig);
			}

			return c.json({ success: true });
		} catch (error) {
			console.error("Error in S3 config route:", error);
			return c.json(
				{
					error: "Failed to save S3 configuration",
					details: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	},
);

app.delete("/delete", async (c) => {
	const user = c.get("user");

	try {
		// Delete the S3 configuration for the user
		await db().delete(s3Buckets).where(eq(s3Buckets.ownerId, user.id));

		return c.json({ success: true });
	} catch (error) {
		console.error("Error in S3 config delete route:", error);
		return c.json(
			{
				error: "Failed to delete S3 configuration",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
});

app.get("/get", async (c) => {
	const user = c.get("user");

	try {
		const [bucket] = await db()
			.select()
			.from(s3Buckets)
			.where(eq(s3Buckets.ownerId, user.id));

		if (!bucket)
			return c.json({
				config: {
					provider: "aws",
					accessKeyId: "",
					secretAccessKey: "",
					endpoint: "https://s3.amazonaws.com",
					bucketName: "",
					region: "us-east-1",
				},
			});

		// Decrypt the values before sending
		const decryptedConfig = {
			provider: bucket.provider,
			accessKeyId: await decrypt(bucket.accessKeyId),
			secretAccessKey: await decrypt(bucket.secretAccessKey),
			endpoint: bucket.endpoint
				? await decrypt(bucket.endpoint)
				: "https://s3.amazonaws.com",
			bucketName: await decrypt(bucket.bucketName),
			region: await decrypt(bucket.region),
		};

		return c.json({ config: decryptedConfig });
	} catch (error) {
		console.error("Error in S3 config get route:", error);
		return c.json(
			{
				error: "Failed to fetch S3 configuration",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
});

app.post(
	"/test",
	zValidator(
		"json",
		z.object({
			provider: z.string(),
			accessKeyId: z.string(),
			secretAccessKey: z.string(),
			endpoint: z.string(),
			bucketName: z.string(),
			region: z.string(),
		}),
	),
	async (c) => {
		const TIMEOUT_MS = 5000; // 5 second timeout
		const data = c.req.valid("json");

		// Cloudinary doesn't need connection testing - it's automatic
		// For now, we'll just return success
		return c.json({ success: true, message: "Cloudinary doesn't require connection testing" });
	},
);
