import { decrypt } from "@cap/database/crypto";
import type { S3Bucket, User } from "@cap/web-domain";
import { Config, Effect, Layer, Option } from "effect";

import { CloudinaryService } from "../Cloudinary/index.ts";
import { Database } from "../Database.ts";
import { createCloudinaryBucketAccess } from "../Cloudinary/CloudinaryBucketAccess.ts";
import { S3BucketsRepo } from "../S3Buckets/S3BucketsRepo.ts";

// For backward compatibility, we'll keep the S3Bucket type but use Cloudinary
export class CloudinaryBuckets extends Effect.Service<CloudinaryBuckets>()(
	"CloudinaryBuckets",
	{
		effect: Effect.gen(function* () {
			console.log("CloudinaryBuckets: Starting initialization...");
			const repo = yield* S3BucketsRepo;
			console.log("CloudinaryBuckets: Got S3BucketsRepo");
			const cloudinaryService = yield* CloudinaryService.pipe(
				Effect.catchAll((error) => {
					console.error("CloudinaryBuckets: CloudinaryService failed:", error);
					return Effect.fail(error);
				}),
			);
			console.log("CloudinaryBuckets: Got CloudinaryService");

			const defaultConfigs = {
				cloudName: cloudinaryService.cloudName || "",
			};
			console.log("CloudinaryBuckets: Initialization successful");

			const getBucketAccess = Effect.fn("CloudinaryBuckets.getProviderLayer")(
				function* (customBucket: Option.Option<S3Bucket.S3Bucket>) {
					// For now, we'll use the default Cloudinary account
					// Custom buckets (per-user) can be implemented later if needed
					// Provide CloudinaryService to createCloudinaryBucketAccess
					// Since we already have cloudinaryService in scope, we can provide it
					return yield* createCloudinaryBucketAccess.pipe(
						Effect.provide(Layer.succeed(CloudinaryService, cloudinaryService)),
					);
				},
			);

			return {
				getBucketAccess: Effect.fn("CloudinaryBuckets.getBucketAccess")(
					function* (bucketId?: Option.Option<S3Bucket.S3BucketId>) {
						const customBucket = yield* (bucketId ?? Option.none()).pipe(
							Option.map(repo.getById),
							Effect.transposeOption,
							Effect.map(Option.flatten),
						);

						return yield* getBucketAccess(customBucket);
					},
				),

				getBucketAccessForUser: Effect.fn(
					"CloudinaryBuckets.getProviderForUser",
				)(function* (userId: User.UserId) {
					return yield* repo
						.getForUser(userId)
						.pipe(
							Effect.option,
							Effect.map(Option.flatten),
							Effect.flatMap(getBucketAccess),
						);
				}),
			};
		}),
		dependencies: [S3BucketsRepo.Default, Database.Default, CloudinaryService.Default],
	},
) {
	static getBucketAccess = (bucketId: Option.Option<S3Bucket.S3BucketId>) =>
		Effect.flatMap(CloudinaryBuckets, (b) =>
			b.getBucketAccess(Option.fromNullable(bucketId).pipe(Option.flatten)),
		);
	static getBucketAccessForUser = (userId: User.UserId) =>
		Effect.flatMap(CloudinaryBuckets, (b) => b.getBucketAccessForUser(userId));
}

