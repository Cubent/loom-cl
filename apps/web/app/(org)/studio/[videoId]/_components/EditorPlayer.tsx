"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorContext, FPS, OUTPUT_SIZE } from "./context/EditorContext";

const gridStyle: React.CSSProperties = {
	backgroundImage:
		"linear-gradient(45deg, rgba(128,128,128,0.12) 25%, transparent 25%), " +
		"linear-gradient(-45deg, rgba(128,128,128,0.12) 25%, transparent 25%), " +
		"linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.12) 75%), " +
		"linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.12) 75%)",
	backgroundSize: "40px 40px",
	backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
	backgroundColor: "rgba(200,200,200,0.08)",
};

export function EditorPlayer() {
	const {
		videoUrl,
		editorState,
		setEditorState,
		videoDuration,
		project,
	} = useEditorContext();
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });

	// Render frame to canvas with backgrounds, camera, and effects
	const renderFrame = useCallback(() => {
		const canvas = canvasRef.current;
		const video = videoRef.current;
		if (!canvas || !video || video.readyState < 2) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw background
		const bg = project.background.source;
		if (bg.type === "color") {
			ctx.fillStyle = `rgb(${bg.color.join(",")})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else if (bg.type === "gradient") {
			const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
			gradient.addColorStop(0, `rgb(${bg.from.join(",")})`);
			gradient.addColorStop(1, `rgb(${bg.to.join(",")})`);
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else if (bg.type === "image" && bg.url) {
			// For image backgrounds, we'd need to load the image
			// For now, fallback to color
			ctx.fillStyle = "rgb(0, 0, 0)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else if (bg.type === "wallpaper") {
			// For wallpapers, we'd need to load the wallpaper
			// For now, fallback to color
			ctx.fillStyle = "rgb(0, 0, 0)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		// Draw video frame (cropped if needed)
		const crop = project.background.crop;
		if (crop) {
			ctx.drawImage(
				video,
				crop.position.x,
				crop.position.y,
				crop.size.x,
				crop.size.y,
				0,
				0,
				canvas.width,
				canvas.height,
			);
		} else {
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		}

		// Draw camera overlay if not hidden
		if (!project.camera.hide) {
			const { position, size, shape, shadow } = project.camera;
			ctx.save();

			// Apply shadow if enabled
			if (shadow) {
				ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
				ctx.shadowBlur = 10;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 4;
			}

			// Draw camera frame (simplified - would need actual camera feed)
			ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
			if (shape === "square") {
				ctx.fillRect(position.x, position.y, size.x, size.y);
			} else {
				// Source shape - would need actual camera feed
				ctx.fillRect(position.x, position.y, size.x, size.y);
			}

			ctx.restore();
		}
	}, [project, videoUrl]);

	// Update canvas size based on container
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateSize = () => {
			const rect = container.getBoundingClientRect();
			const aspect = OUTPUT_SIZE.x / OUTPUT_SIZE.y;
			let width = rect.width - 8;
			let height = width / aspect;

			if (height > rect.height - 8) {
				height = rect.height - 8;
				width = height * aspect;
			}

			setCanvasSize({ width, height });
		};

		updateSize();
		const resizeObserver = new ResizeObserver(updateSize);
		resizeObserver.observe(container);

		return () => resizeObserver.disconnect();
	}, []);

	// Render frame when video updates
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleSeeked = () => {
			renderFrame();
		};

		const handleTimeUpdate = () => {
			if (!editorState.playing) {
				renderFrame();
			}
			setEditorState((state) => ({
				...state,
				playbackTime: video.currentTime,
			}));
		};

		video.addEventListener("seeked", handleSeeked);
		video.addEventListener("timeupdate", handleTimeUpdate);

		// Initial render
		if (video.readyState >= 2) {
			renderFrame();
		}

		return () => {
			video.removeEventListener("seeked", handleSeeked);
			video.removeEventListener("timeupdate", handleTimeUpdate);
		};
	}, [renderFrame, editorState.playing, setEditorState]);

	// Re-render when project changes
	useEffect(() => {
		renderFrame();
	}, [project, renderFrame]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (editorState.playing) {
			video.play();
		} else {
			video.pause();
		}
	}, [editorState.playing]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !editorState.playbackTime) return;

		if (Math.abs(video.currentTime - editorState.playbackTime) > 0.1) {
			video.currentTime = editorState.playbackTime;
		}
	}, [editorState.playbackTime]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = () => {
			setIsLoading(false);
			renderFrame();
		};

		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
	}, [renderFrame]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center flex-1 bg-gray-2 rounded-lg">
				<p className="text-gray-11">Loading video...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 min-w-0 bg-gray-2 rounded-lg overflow-hidden border border-gray-3">
			<div
				ref={containerRef}
				className="relative flex-1 flex items-center justify-center"
				style={gridStyle}
			>
				<canvas
					ref={canvasRef}
					className="max-w-full max-h-full rounded"
					width={OUTPUT_SIZE.x}
					height={OUTPUT_SIZE.y}
					style={{
						width: `${canvasSize.width}px`,
						height: `${canvasSize.height}px`,
					}}
				/>
				<video
					ref={videoRef}
					src={videoUrl || undefined}
					className="hidden"
					crossOrigin="anonymous"
					preload="metadata"
				/>
			</div>
			<div className="p-4 border-t border-gray-3">
				<div className="flex items-center gap-2">
					<button
						onClick={() =>
							setEditorState((state) => ({
								...state,
								playing: !state.playing,
							}))
						}
						className="px-4 py-2 bg-gray-3 rounded hover:bg-gray-4 transition-colors"
					>
						{editorState.playing ? "⏸" : "▶"}
					</button>
					<div className="flex-1 text-sm text-gray-11 tabular-nums">
						{formatTime(editorState.playbackTime)} / {formatTime(videoDuration)}
					</div>
				</div>
			</div>
		</div>
	);
}

function formatTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

