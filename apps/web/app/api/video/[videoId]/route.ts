import { getCurrentUser } from "@cap/database/auth/session";
import { Videos } from "@cap/web-backend";
import { Video } from "@cap/web-domain";
import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";
import { runPromise } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ videoId: string }> },
) {
	const { videoId } = await params;
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await runPromise(
			Effect.gen(function* () {
				const videos = yield* Videos;
				const [video] = yield* videos
					.getByIdForViewing(videoId as Video.VideoId)
					.pipe(
						Effect.flatten,
						Effect.catchTag(
							"NoSuchElementException",
							() => new Error("Video not found"),
						),
					);

				// Get video URL from Cloudinary
				const downloadInfo = yield* videos.getDownloadInfo(
					videoId as Video.VideoId,
				);

				return {
					id: video.id,
					name: video.name,
					duration: video.duration ?? 0,
					width: video.width ?? 1920,
					height: video.height ?? 1080,
					fps: video.fps ?? 30,
					url: downloadInfo
						? downloadInfo.downloadUrl
						: `/api/playlist?videoId=${videoId}&videoType=mp4`,
				};
			}),
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error fetching video:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to fetch video" },
			{ status: 500 },
		);
	}
}

