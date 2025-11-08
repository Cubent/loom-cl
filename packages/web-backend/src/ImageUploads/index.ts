import { ImageUpload } from "@cap/web-domain";
import { Effect, Option } from "effect";

import { Database, type DbClient } from "../Database";
import { CloudinaryBuckets } from "../CloudinaryBuckets/index.ts";

export class ImageUploads extends Effect.Service<ImageUploads>()(
	"ImageUploads",
	{
		effect: Effect.gen(function* () {
			console.log("ImageUploads: Starting initialization...");
			const s3Buckets = yield* CloudinaryBuckets;
			console.log("ImageUploads: Got CloudinaryBuckets");
			const db = yield* Database;
			console.log("ImageUploads: Got Database");

			console.log("ImageUploads: Calling getBucketAccess()...");
			const bucketAccessResult = yield* s3Buckets.getBucketAccess().pipe(
				Effect.catchAll((error) => {
					console.error("ImageUploads: getBucketAccess failed:", error);
					return Effect.fail(error instanceof Error ? error : new Error(String(error)));
				}),
			);
			console.log("ImageUploads: Got bucket access result");
			// getBucketAccess returns the bucket access object directly, not an array
			const s3 = Array.isArray(bucketAccessResult) ? bucketAccessResult[0] : bucketAccessResult;
			console.log("ImageUploads: Got bucket access");

			const applyUpdate = Effect.fn("ImageUploads.applyUpdate")(
				function* (args: {
					payload: ImageUpload.ImageUpdatePayload;
					existing: Option.Option<ImageUpload.ImageUrlOrKey>;
					keyPrefix: string;
					update: (
						db: DbClient,
						urlOrKey: ImageUpload.ImageKey | null,
					) => Promise<unknown>;
				}) {
					yield* Option.match(args.payload, {
						onSome: Effect.fn(function* (image) {
							const fileExtension = image.fileName.split(".").pop() || "jpg";
							const s3Key = ImageUpload.ImageKey.make(
								`${args.keyPrefix}/${Date.now()}.${fileExtension}`,
							);

							yield* s3.putObject(s3Key, image.data, {
								contentType: image.contentType,
							});

							yield* db.use((db) => args.update(db, s3Key));
						}),
						onNone: () => db.use((db) => args.update(db, null)),
					});

					yield* args.existing.pipe(
						Option.andThen((iconKeyOrUrl) =>
							ImageUpload.extractFileKey(iconKeyOrUrl, s3.isPathStyle),
						),
						Option.map(s3.deleteObject),
						Effect.transposeOption,
					);
				},
			);

			const resolveImageUrl = Effect.fn(function* (
				urlOrKey: ImageUpload.ImageUrlOrKey,
			) {
				const key = ImageUpload.extractFileKey(urlOrKey, s3.isPathStyle);

				return yield* Option.match(key, {
					onSome: (key) => s3.getSignedObjectUrl(key),
					onNone: () => Effect.succeed(urlOrKey),
				}).pipe(Effect.map(ImageUpload.ImageUrl.make));
			});

			return { applyUpdate, resolveImageUrl };
		}),
		dependencies: [CloudinaryBuckets.Default, Database.Default],
	},
) {}
