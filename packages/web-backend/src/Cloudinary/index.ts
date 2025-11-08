import { v2 as cloudinary } from "cloudinary";
import { Config, Effect, Layer, Option } from "effect";

import { Database } from "../Database.ts";

// Configure Cloudinary
const configureCloudinary = Effect.gen(function* () {
	const cloudName = yield* Config.string("CLOUDINARY_CLOUD_NAME").pipe(
		Config.orElse(() => Config.succeed("")),
	);
	const apiKey = yield* Config.string("CLOUDINARY_API_KEY").pipe(
		Config.orElse(() => Config.succeed("")),
	);
	const apiSecret = yield* Config.string("CLOUDINARY_API_SECRET").pipe(
		Config.orElse(() => Config.succeed("")),
	);
	const secure = yield* Config.boolean("CLOUDINARY_SECURE").pipe(
		Config.orElse(() => Config.succeed(true)),
	);

	// Only configure if all credentials are provided
	if (!cloudName || !apiKey || !apiSecret) {
		return yield* Effect.fail(new Error("Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"));
	}

	// Configure Cloudinary - wrap in try-catch to ensure we always return an Error
	try {
		yield* Effect.try({
			try: () => {
				cloudinary.config({
					cloud_name: cloudName,
					api_key: apiKey,
					api_secret: apiSecret,
					secure: secure,
				});
			},
			catch: (error) => {
				// Ensure we always return an Error object
				if (error instanceof Error) {
					return error;
				}
				return new Error(`Failed to configure Cloudinary: ${String(error)}`);
			},
		});
	} catch (error) {
		// Catch any synchronous errors that might escape Effect.try
		return yield* Effect.fail(
			error instanceof Error
				? error
				: new Error(`Cloudinary configuration error: ${String(error)}`),
		);
	}

	return { cloudName, apiKey, apiSecret, secure };
});

export class CloudinaryService extends Effect.Service<CloudinaryService>()(
	"CloudinaryService",
	{
		effect: Effect.gen(function* () {
			console.log("CloudinaryService: Starting initialization...");
			const config = yield* configureCloudinary.pipe(
				Effect.catchAll((error) => {
					console.error("CloudinaryService initialization failed:", error);
					console.error("Error type:", typeof error);
					console.error("Error constructor:", error?.constructor?.name);
					if (error instanceof Error) {
						console.error("Error message:", error.message);
						console.error("Error stack:", error.stack);
					}
					return Effect.fail(error instanceof Error ? error : new Error(String(error)));
				}),
			);

			console.log("CloudinaryService: Initialization successful");
			return {
				cloudName: config.cloudName || "",
				getSignedUploadUrl: (publicId: string, options?: {
					resourceType?: "image" | "video" | "raw" | "auto";
					folder?: string;
					overwrite?: boolean;
				}) =>
					Effect.gen(function* () {
						const timestamp = Math.round(new Date().getTime() / 1000);
						const params: Record<string, any> = {
							public_id: publicId,
							timestamp,
							resource_type: options?.resourceType || "video",
							folder: options?.folder,
							overwrite: options?.overwrite !== false,
						};

						// Remove undefined values
						Object.keys(params).forEach(
							(key) =>
								params[key] === undefined &&
								delete params[key],
						);

						const signature = yield* Effect.try({
							try: () => cloudinary.utils.api_sign_request(
								params,
								config.apiSecret,
							),
							catch: (error) => new Error(`Failed to sign Cloudinary request: ${error}`),
						});

						return {
							url: `https://api.cloudinary.com/v1_1/${config.cloudName}/${params.resource_type}/upload`,
							params: {
								...params,
								signature,
								api_key: config.apiKey,
							},
						};
					}),
				getUrl: (
					publicId: string,
					options?: {
						resourceType?: "image" | "video" | "raw" | "auto";
						transformation?: string;
						format?: string;
						secure?: boolean;
					},
				) =>
					Effect.try({
						try: () => cloudinary.url(publicId, {
							resource_type: options?.resourceType || "video",
							transformation: options?.transformation,
							format: options?.format,
							secure: options?.secure ?? config.secure,
						}),
						catch: (error) => new Error(`Failed to generate Cloudinary URL: ${error}`),
					}),
				upload: (
					file: string | Buffer | NodeJS.ReadableStream,
					options?: {
						publicId?: string;
						resourceType?: "image" | "video" | "raw" | "auto";
						folder?: string;
						overwrite?: boolean;
						chunkSize?: number;
					},
				) =>
					Effect.tryPromise({
						try: () =>
							cloudinary.uploader.upload(file, {
								public_id: options?.publicId,
								resource_type: options?.resourceType || "video",
								folder: options?.folder,
								overwrite: options?.overwrite !== false,
								chunk_size: options?.chunkSize || 6000000, // 6MB chunks
							}),
						catch: (error) => new Error(`Failed to upload to Cloudinary: ${error}`),
					}),
				uploadLarge: (
					file: string | Buffer | NodeJS.ReadableStream,
					options?: {
						publicId?: string;
						resourceType?: "image" | "video" | "raw" | "auto";
						folder?: string;
						overwrite?: boolean;
					},
				) =>
					Effect.tryPromise({
						try: () =>
							cloudinary.uploader.upload_large(file, {
								public_id: options?.publicId,
								resource_type: options?.resourceType || "video",
								folder: options?.folder,
								overwrite: options?.overwrite !== false,
							}),
						catch: (error) => new Error(`Failed to upload large file to Cloudinary: ${error}`),
					}),
				delete: (publicId: string, options?: {
					resourceType?: "image" | "video" | "raw" | "auto";
					invalidate?: boolean;
				}) =>
					Effect.tryPromise({
						try: () =>
							cloudinary.uploader.destroy(publicId, {
								resource_type: options?.resourceType || "video",
								invalidate: options?.invalidate ?? true,
							}),
						catch: (error) => new Error(`Failed to delete from Cloudinary: ${error}`),
					}),
				uploadStream: (
					options?: {
						publicId?: string;
						resourceType?: "image" | "video" | "raw" | "auto";
						folder?: string;
						overwrite?: boolean;
					},
				) =>
					Effect.try({
						try: () => cloudinary.uploader.upload_stream(
							{
								public_id: options?.publicId,
								resource_type: options?.resourceType || "video",
								folder: options?.folder,
								overwrite: options?.overwrite !== false,
							},
							(error, result) => {
								if (error) {
									console.error("Cloudinary upload error:", error);
								}
							},
						),
						catch: (error) => new Error(`Failed to create Cloudinary upload stream: ${error}`),
					}),
			};
		}),
		dependencies: [Database.Default],
	},
) {
	static getSignedUploadUrl = (
		publicId: string,
		options?: {
			resourceType?: "image" | "video" | "raw" | "auto";
			folder?: string;
			overwrite?: boolean;
		},
	) =>
		Effect.flatMap(CloudinaryService, (service) =>
			service.getSignedUploadUrl(publicId, options),
		);
	static getUrl = (
		publicId: string,
		options?: {
			resourceType?: "image" | "video" | "raw" | "auto";
			transformation?: string;
			format?: string;
			secure?: boolean;
		},
	) =>
		Effect.flatMap(CloudinaryService, (service) =>
			service.getUrl(publicId, options),
		);
	static upload = (
		file: string | Buffer | NodeJS.ReadableStream,
		options?: {
			publicId?: string;
			resourceType?: "image" | "video" | "raw" | "auto";
			folder?: string;
			overwrite?: boolean;
			chunkSize?: number;
		},
	) =>
		Effect.flatMap(CloudinaryService, (service) =>
			service.upload(file, options),
		);
	static delete = (
		publicId: string,
		options?: {
			resourceType?: "image" | "video" | "raw" | "auto";
			invalidate?: boolean;
		},
	) =>
		Effect.flatMap(CloudinaryService, (service) =>
			service.delete(publicId, options),
		);
}

