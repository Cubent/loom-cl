// Cloudinary doesn't need presigned posts, but we'll keep the interface for compatibility
import { db, updateIfDefined } from "@cap/database";
import * as Db from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { CloudinaryBuckets } from "@cap/web-backend";
import { Video } from "@cap/web-domain";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { Hono } from "hono";
import { z } from "zod";

import { runPromise } from "@/lib/server";
import {
	isAtLeastSemver,
	isFromDesktopSemver,
	UPLOAD_PROGRESS_VERSION,
} from "@/utils/desktop";
import { stringOrNumberOptional } from "@/utils/zod";
import { withAuth } from "../../utils";
import { parseVideoIdOrFileKey } from "../utils";

export const app = new Hono().use(withAuth);

app.post(
	"/",
	zValidator(
		"json",
		z
			.object({
				method: z.union([z.literal("post"), z.literal("put")]).default("post"),
				durationInSecs: stringOrNumberOptional,
				width: stringOrNumberOptional,
				height: stringOrNumberOptional,
				fps: stringOrNumberOptional,
			})
			.and(
				z.union([
					// DEPRECATED
					z.object({ fileKey: z.string() }),
					z.object({ videoId: z.string(), subpath: z.string() }),
				]),
			),
	),
	async (c) => {
		const user = c.get("user");
		const { durationInSecs, width, height, fps, method, ...body } =
			c.req.valid("json");

		const fileKey = parseVideoIdOrFileKey(user.id, body);

		try {
			// Cloudinary handles CDN automatically, no need for CloudFront invalidation

			const contentType = fileKey.endsWith(".aac")
				? "audio/aac"
				: fileKey.endsWith(".webm")
					? "audio/webm"
					: fileKey.endsWith(".mp4")
						? "video/mp4"
						: fileKey.endsWith(".mp3")
							? "audio/mpeg"
							: fileKey.endsWith(".m3u8")
								? "application/x-mpegURL"
								: "video/mp2t";

			let data: { url: string; fields: Record<string, string> };

			await Effect.gen(function* () {
				const [bucket] = yield* CloudinaryBuckets.getBucketAccess(
					Option.fromNullable(customBucket?.id),
				);

				if (method === "post") {
					const Fields = {
						"Content-Type": contentType,
						"x-amz-meta-userid": user.id,
						"x-amz-meta-duration": durationInSecs
							? durationInSecs.toString()
							: "",
					};

					data = yield* bucket.getPresignedPostUrl(fileKey, {
						Fields,
						Expires: 1800,
					});
				} else if (method === "put") {
					const presignedUrl = yield* bucket.getPresignedPutUrl(
						fileKey,
						{
							ContentType: contentType,
							Metadata: {
								userid: user.id,
								duration: durationInSecs ? durationInSecs.toString() : "",
							},
						},
						{ expiresIn: 1800 },
					);

					data = { url: presignedUrl, fields: {} };
				}
			}).pipe(runPromise);

			console.log("Presigned URL created successfully");

			// After successful presigned URL creation, trigger revalidation
			const videoIdFromKey = fileKey.split("/")[1]; // Assuming fileKey format is userId/videoId/...

			const videoIdToUse = "videoId" in body ? body.videoId : videoIdFromKey;
			if (videoIdToUse) {
				const videoId = Video.VideoId.make(videoIdToUse);
				await db()
					.update(Db.videos)
					.set({
						duration: updateIfDefined(durationInSecs, Db.videos.duration),
						width: updateIfDefined(width, Db.videos.width),
						height: updateIfDefined(height, Db.videos.height),
						fps: updateIfDefined(fps, Db.videos.fps),
					})
					.where(
						and(eq(Db.videos.id, videoId), eq(Db.videos.ownerId, user.id)),
					);

				// i hate this but it'll have to do
				const clientSupportsUploadProgress = isFromDesktopSemver(
					c.req,
					UPLOAD_PROGRESS_VERSION,
				);
				if (fileKey.endsWith("result.mp4") && clientSupportsUploadProgress)
					await db()
						.update(Db.videoUploads)
						.set({ mode: "singlepart" })
						.where(eq(Db.videoUploads.videoId, videoId));
			}

			if (method === "post") return c.json({ presignedPostData: data! });
			else return c.json({ presignedPutData: data! });
		} catch (s3Error) {
			console.error("S3 operation failed:", s3Error);
			throw new Error(
				`S3 operation failed: ${
					s3Error instanceof Error ? s3Error.message : "Unknown error"
				}`,
			);
		}
	},
);
