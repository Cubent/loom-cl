import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { Effect, Option, Stream } from "effect";

import { CloudinaryService } from "./index.ts";

// Wrap cloudinary calls to ensure they never throw synchronously
const safeCloudinaryApiResource = (publicId: string, options: { resource_type: string }) => {
	try {
		return cloudinary.api.resource(publicId, options);
	} catch (error) {
		// Ensure we always throw an Error object
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Cloudinary API resource failed: ${String(error)}`);
	}
};

// Convert S3-style key (e.g., "userId/videoId/result.mp4") to Cloudinary public_id
// Cloudinary uses folder structure, so we can keep the same structure
// Note: Cloudinary preserves the path structure, so we keep the full key as public_id
// The format will be determined by the uploaded file
const keyToPublicId = (key: string): string => {
	// Keep the full key as public_id, Cloudinary will handle the format automatically
	// This ensures the path structure is preserved (e.g., "userId/videoId/result")
	return key.replace(/\.[^/.]+$/, "");
};

const publicIdToKey = (publicId: string, format?: string): string => {
	return format ? `${publicId}.${format}` : publicId;
};

export const createCloudinaryBucketAccess = Effect.gen(function* () {
	console.log("createCloudinaryBucketAccess: Starting...");
	const service = yield* CloudinaryService.pipe(
		Effect.catchAllCause((cause) => {
			console.error("createCloudinaryBucketAccess: CloudinaryService cause:", cause);
			console.error("Cause type:", cause._tag);
			if (cause._tag === "Die") {
				const defect = (cause as any).defect;
				console.error("Die defect:", defect);
				console.error("Defect type:", typeof defect);
				console.error("Defect constructor:", defect?.constructor?.name);
				if (defect instanceof Error) {
					console.error("Error message:", defect.message);
					console.error("Error stack:", defect.stack);
				}
				return Effect.fail(defect instanceof Error ? defect : new Error(`CloudinaryService died: ${String(defect)}`));
			}
			return Effect.fail(new Error(`CloudinaryService failed: ${cause._tag}`));
		}),
	);
	console.log("createCloudinaryBucketAccess: Got CloudinaryService");
	console.log("createCloudinaryBucketAccess: service.cloudName =", service.cloudName);

	const bucketAccess = {
		bucketName: service.cloudName,
		isPathStyle: false, // Cloudinary doesn't use path style
		getSignedObjectUrl: (key: string, expiresIn = 3600) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				// Cloudinary URLs are already signed via transformations, but we can generate a signed URL
				const url = yield* service.getUrl(publicId, {
					resourceType: "video",
					secure: true,
				});
				// For signed URLs, we can add expiration via transformation
				// Cloudinary doesn't have traditional signed URLs like S3, but we can use transformations
				return url;
			}).pipe(Effect.withSpan("getSignedObjectUrl")),
		getObject: (key: string) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				const url = yield* service.getUrl(publicId, {
					resourceType: "video",
					secure: true,
				});

				// Fetch the object content
				const response = yield* Effect.tryPromise({
					try: () => fetch(url),
					catch: (error) => error as Error,
				});
				if (!response.ok) {
					return Option.none();
				}
				const text = yield* Effect.tryPromise({
					try: () => response.text(),
					catch: (error) => error as Error,
				});
				return Option.some(text);
			}),
		listObjects: (config: { prefix?: string; maxKeys?: number }) =>
			Effect.gen(function* () {
				// Cloudinary doesn't have a direct list API like S3
				// We'd need to use the Admin API or search API
				// For now, return empty result
				return {
					Contents: [],
					IsTruncated: false,
				};
			}),
		headObject: (key: string) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				// Use Cloudinary's resource API to check if object exists
				const result = yield* Effect.tryPromise({
					try: () => safeCloudinaryApiResource(publicId, {
						resource_type: "video",
					}),
					catch: () => null as any,
				}).pipe(Effect.option);

				if (Option.isNone(result)) {
					return yield* Effect.fail(new Error("Object not found"));
				}

				return {
					ContentLength: result.value.bytes,
					ContentType: result.value.format ? `video/${result.value.format}` : "video/mp4",
					LastModified: new Date(result.value.created_at),
				};
			}),
		putObject: <E>(
			key: string,
			body: string | Uint8Array | ArrayBuffer | Stream.Stream<Uint8Array, E>,
			fields?: { contentType?: string; contentLength?: number },
		) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				let uploadResult;

				if (typeof body === "string") {
					// If it's a string (like VTT file), convert to buffer
					uploadResult = yield* service.upload(Buffer.from(body), {
						publicId,
						resourceType: "raw", // For text files like VTT
						folder: undefined,
					});
				} else if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
					uploadResult = yield* service.upload(body, {
						publicId,
						resourceType: "video",
						folder: undefined,
					});
				} else {
					// Stream upload
					const stream = yield* service.uploadStream({
						publicId,
						resourceType: "video",
						folder: undefined,
					});

					// Convert Effect stream to Node stream and pipe
					const nodeStream = Readable.fromWeb(
						body.pipe(
							Stream.toReadableStreamRuntime(yield* Effect.runtime()),
					) as any,
					);
					nodeStream.pipe(stream);

					// Wait for upload to complete
					uploadResult = yield* Effect.promise(() => new Promise((resolve, reject) => {
						stream.on("end", async () => {
							try {
								// Get the result from Cloudinary
								const result = await safeCloudinaryApiResource(publicId, {
									resource_type: "video",
								});
								resolve(result);
							} catch (error) {
								reject(error instanceof Error ? error : new Error(String(error)));
							}
						});
						stream.on("error", reject);
					}));
				}

				return {
					ETag: uploadResult.public_id,
					VersionId: uploadResult.version?.toString(),
				};
			}).pipe(
				Effect.withSpan("CloudinaryBucketAccess.putObject", {
					attributes: { key },
				}),
			),
		copyObject: (source: string, key: string) =>
			Effect.gen(function* () {
				const sourcePublicId = keyToPublicId(source);
				const destPublicId = keyToPublicId(key);

				// Cloudinary doesn't have direct copy, we need to download and re-upload
				// Or use the rename API if it's in the same account
				const sourceUrl = yield* service.getUrl(sourcePublicId, {
					resourceType: "video",
				});

				const response = yield* Effect.tryPromise({
					try: () => fetch(sourceUrl),
					catch: (error) => error as Error,
				});
				if (!response.ok) {
					return yield* Effect.fail(new Error("Source object not found"));
				}

				const arrayBuffer = yield* Effect.tryPromise({
					try: () => response.arrayBuffer(),
					catch: (error) => error as Error,
				});
				const buffer = Buffer.from(arrayBuffer);
				const uploadResult = yield* service.upload(buffer, {
					publicId: destPublicId,
					resourceType: "video",
				});

				return {
					ETag: uploadResult.public_id,
					VersionId: uploadResult.version?.toString(),
				};
			}),
		deleteObject: (key: string) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				yield* service.delete(publicId, {
					resourceType: "video",
					invalidate: true,
				});
				return {};
			}),
		deleteObjects: (objects: Array<{ Key: string }>) =>
			Effect.gen(function* () {
				// Delete all objects
				const deleteEffects = objects.map((obj) => {
					const publicId = keyToPublicId(obj.Key);
					return service.delete(publicId, {
						resourceType: "video",
						invalidate: true,
					});
				});

				yield* Effect.all(deleteEffects);
				return {
					Deleted: objects.map((obj) => ({ Key: obj.Key })),
				};
			}).pipe(Effect.when(() => objects.length > 0)),
		getPresignedPutUrl: (key: string) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				const { url, params } = yield* service.getSignedUploadUrl(publicId, {
					resourceType: "video",
				});
				// Return the upload URL with params
				return `${url}?${new URLSearchParams(params as any).toString()}`;
			}),
		getPresignedPostUrl: (
			key: string,
			args?: { Fields?: Record<string, string>; Expires?: number },
		) =>
			Effect.gen(function* () {
				const publicId = keyToPublicId(key);
				const { url, params } = yield* service.getSignedUploadUrl(publicId, {
					resourceType: "video",
				});

				// Cloudinary uses POST with form data
				return {
					url,
					fields: {
						...params,
						...(args?.Fields || {}),
					} as Record<string, string>,
				};
			}),
		multipart: {
			create: (key: string) =>
				Effect.gen(function* () {
					const publicId = keyToPublicId(key);
					// Cloudinary handles large uploads automatically, but we can track it
					return {
						UploadId: publicId, // Use publicId as upload ID
						Key: key,
					};
				}),
			getPresignedUploadPartUrl: (
				key: string,
				uploadId: string,
				partNumber: number,
			) =>
				Effect.gen(function* () {
					// Cloudinary doesn't use multipart uploads like S3
					// It handles chunked uploads automatically
					// Return a URL that can be used for chunked upload
					const publicId = keyToPublicId(key);
					const { url, params } = yield* service.getSignedUploadUrl(publicId, {
						resourceType: "video",
					});
					return `${url}?${new URLSearchParams(params as any).toString()}`;
				}),
			complete: (key: string, uploadId: string, parts?: Array<{ ETag: string; PartNumber: number }>) =>
				Effect.gen(function* () {
					// Cloudinary handles completion automatically
					// Just verify the upload completed
					const publicId = keyToPublicId(key);
					const result = yield* Effect.tryPromise({
						try: () => safeCloudinaryApiResource(publicId, {
							resource_type: "video",
						}),
						catch: () => null as any,
					}).pipe(Effect.option);

					if (Option.isNone(result)) {
						return yield* Effect.fail(new Error("Upload not found"));
					}

					return {
						Location: result.value.secure_url,
						ETag: result.value.public_id,
					};
				}),
		},
	};
	console.log("createCloudinaryBucketAccess: Created bucketAccess object");
	return bucketAccess;
});

export type CloudinaryBucketAccess = Effect.Effect.Success<
	typeof createCloudinaryBucketAccess
>;

