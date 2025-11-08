"use client";

import { ToggleButton as KToggleButton } from "~/components/kobalte-compat";
import { cx } from "cva";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Tooltip from "~/components/Tooltip";
import AspectRatioSelect from "./AspectRatioSelect";
import { FPS, OUTPUT_SIZE, useEditorContext } from "./context/EditorContext";
import { EditorButton, Slider } from "./ui";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { formatTime } from "./utils";
import { Crop, SkipBack, Play, Pause, SkipForward, Scissors, ZoomOut, ZoomIn } from "lucide-react";

export function EditorPlayer() {
	const {
		project,
		videoData,
		videoUrl,
		setDialog,
		totalDuration,
		editorState,
		setEditorState,
		zoomOutLimit,
	} = useEditorContext();

	const isAtEnd = useMemo(() => {
		return totalDuration > 0 && totalDuration - editorState.playbackTime <= 0.1;
	}, [totalDuration, editorState.playbackTime]);

	const cropDialogHandler = useCallback(() => {
		if (!videoData) return;
		setDialog({
			open: true,
			type: "crop",
			position: {
				...(project.background.crop?.position ?? { x: 0, y: 0 }),
			},
			size: {
				...(project.background.crop?.size ?? {
					x: videoData.width,
					y: videoData.height,
				}),
			},
		});
		setEditorState((prev) => ({ ...prev, playing: false }));
	}, [videoData, project, setDialog, setEditorState]);

	useEffect(() => {
		if (isAtEnd && editorState.playing) {
			setEditorState((prev) => ({ ...prev, playing: false }));
		}
	}, [isAtEnd, editorState.playing, setEditorState]);

	const handlePlayPauseClick = useCallback(() => {
		if (isAtEnd) {
			setEditorState((prev) => ({
				...prev,
				playbackTime: 0,
				playing: true,
				previewTime: null,
			}));
		} else if (editorState.playing) {
			setEditorState((prev) => ({ ...prev, playing: false }));
		} else {
			setEditorState((prev) => ({
				...prev,
				playing: true,
				previewTime: null,
			}));
		}
	}, [isAtEnd, editorState.playing, setEditorState]);

	const updateZoom = useCallback(
		(newZoom: number, origin: number) => {
			const currentZoom = editorState.timeline.transform.zoom;
			const currentPosition = editorState.timeline.transform.position;
			const zoom = Math.max(Math.min(newZoom, zoomOutLimit), 3);
			const visibleOrigin = origin - currentPosition;
			const originPercentage = Math.min(1, visibleOrigin / currentZoom);
			const newVisibleOrigin = zoom * originPercentage;
			const newPosition = origin - newVisibleOrigin;
			setEditorState((prev) => ({
				...prev,
				timeline: {
					...prev.timeline,
					transform: {
						...prev.timeline.transform,
						zoom,
						position: Math.min(
							Math.max(newPosition, 0),
							Math.max(zoomOutLimit, totalDuration) + 4 - zoom,
						),
					},
				},
			}));
		},
		[editorState.timeline.transform, zoomOutLimit, totalDuration, setEditorState],
	);

	// Register keyboard shortcuts
	useEditorShortcuts(
		() => {
			const el = document.activeElement;
			if (!el) return true;
			const tagName = el.tagName.toLowerCase();
			const isContentEditable = el.getAttribute("contenteditable") === "true";
			return !(tagName === "input" || tagName === "textarea" || isContentEditable);
		},
		[
			{
				combo: "S",
				handler: () => {
					setEditorState((prev) => ({
						...prev,
						timeline: {
							...prev.timeline,
							interactMode: prev.timeline.interactMode === "split" ? "seek" : "split",
						},
					}));
				},
			},
			{
				combo: "Mod+=",
				handler: () => {
					updateZoom(editorState.timeline.transform.zoom / 1.1, editorState.playbackTime);
				},
			},
			{
				combo: "Mod+-",
				handler: () => {
					updateZoom(editorState.timeline.transform.zoom * 1.1, editorState.playbackTime);
				},
			},
			{
				combo: "Space",
				handler: () => {
					const prevTime = editorState.previewTime;
					if (!editorState.playing && prevTime !== null) {
						setEditorState((prev) => ({ ...prev, playbackTime: prevTime }));
					}
					handlePlayPauseClick();
				},
			},
		],
	);

	return (
		<div className="flex flex-col flex-1 rounded-xl border bg-gray-1 dark:bg-gray-2 border-gray-3">
			<div className="flex gap-3 justify-center p-3">
				<AspectRatioSelect />
				<EditorButton
					tooltipText="Crop Video"
					onClick={cropDialogHandler}
					leftIcon={<Crop className="w-5 text-gray-12" />}
				>
					Crop
				</EditorButton>
			</div>
			<PreviewCanvas />
			<div className="flex overflow-hidden z-10 flex-row gap-3 justify-between items-center p-5">
				<div className="flex-1">
					<Time
						className="text-gray-12"
						seconds={Math.max(editorState.previewTime ?? editorState.playbackTime, 0)}
					/>
					<span className="text-gray-11 text-[0.875rem] tabular-nums"> / </span>
					<Time seconds={totalDuration} />
				</div>
				<div className="flex flex-row items-center justify-center text-gray-11 gap-8 text-[0.875rem]">
					<button
						type="button"
						className="transition-opacity hover:opacity-70 will-change-[opacity]"
						onClick={() => {
							setEditorState((prev) => ({
								...prev,
								playing: false,
								playbackTime: 0,
							}));
						}}
					>
						<SkipBack className="text-gray-12 size-3" />
					</button>
					<Tooltip kbd={["Space"]} content="Play/Pause video">
						<button
							type="button"
							onClick={handlePlayPauseClick}
							className="flex justify-center items-center rounded-full border border-gray-300 transition-colors bg-gray-3 hover:bg-gray-4 hover:text-black size-9"
						>
							{!editorState.playing || isAtEnd ? (
								<Play className="text-gray-12 size-3" />
							) : (
								<Pause className="text-gray-12 size-3" />
							)}
						</button>
					</Tooltip>
					<button
						type="button"
						className="transition-opacity hover:opacity-70 will-change-[opacity]"
						onClick={() => {
							setEditorState((prev) => ({
								...prev,
								playing: false,
								playbackTime: totalDuration,
							}));
						}}
					>
						<SkipForward className="text-gray-12 size-3" />
					</button>
				</div>
				<div className="flex flex-row flex-1 gap-4 justify-end items-center">
					<div className="flex-1" />
					<EditorButton
						tooltipText="Toggle Split"
						kbd={["S"]}
						pressed={editorState.timeline.interactMode === "split"}
						onChange={(v: boolean) => {
							setEditorState((prev) => ({
								...prev,
								timeline: {
									...prev.timeline,
									interactMode: v ? "split" : "seek",
								},
							}));
						}}
						as={KToggleButton}
						variant="danger"
						leftIcon={
							<Scissors
								className={cx(
									editorState.timeline.interactMode === "split"
										? "text-white"
										: "text-gray-12",
								)}
							/>
						}
					/>
					<div className="w-px h-8 rounded-full bg-gray-4" />
					<Tooltip kbd={["meta", "-"]} content="Zoom out">
						<ZoomOut
							onClick={() => {
								updateZoom(
									editorState.timeline.transform.zoom * 1.1,
									editorState.playbackTime,
								);
							}}
							className="text-gray-12 size-5 will-change-[opacity] transition-opacity hover:opacity-70 cursor-pointer"
						/>
					</Tooltip>
					<Tooltip kbd={["meta", "+"]} content="Zoom in">
						<ZoomIn
							onClick={() => {
								updateZoom(
									editorState.timeline.transform.zoom / 1.1,
									editorState.playbackTime,
								);
							}}
							className="text-gray-12 size-5 will-change-[opacity] transition-opacity hover:opacity-70 cursor-pointer"
						/>
					</Tooltip>
					<Slider
						className="w-24"
						minValue={0}
						maxValue={1}
						step={0.001}
						value={[
							Math.min(
								Math.max(1 - editorState.timeline.transform.zoom / zoomOutLimit, 0),
								1,
							),
						]}
						onChange={([v]) => {
							updateZoom((1 - v) * zoomOutLimit, editorState.playbackTime);
						}}
						formatTooltip={() =>
							`${editorState.timeline.transform.zoom.toFixed(0)} seconds visible`
						}
					/>
				</div>
			</div>
		</div>
	);
}

// CSS for checkerboard grid (adaptive to light/dark mode)
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

function PreviewCanvas() {
	const { videoUrl, videoData, editorState, project } = useEditorContext();
	const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const updateBounds = () => {
			if (containerRef.current) {
				setContainerBounds(containerRef.current.getBoundingClientRect());
			}
		};
		updateBounds();
		const resizeObserver = new ResizeObserver(updateBounds);
		resizeObserver.observe(containerRef.current);
		return () => resizeObserver.disconnect();
	}, []);

	useEffect(() => {
		if (!videoRef.current || !canvasRef.current || !videoUrl || !videoData) return;

		const video = videoRef.current;
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		video.currentTime = editorState.previewTime ?? editorState.playbackTime;

		const drawFrame = () => {
			if (video.readyState >= 2) {
				canvas.width = videoData.width;
				canvas.height = videoData.height;
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			}
		};

		video.addEventListener("loadeddata", drawFrame);
		drawFrame();

		return () => {
			video.removeEventListener("loadeddata", drawFrame);
		};
	}, [videoUrl, videoData, editorState.previewTime, editorState.playbackTime]);

	if (!videoUrl || !videoData) {
		return (
			<div
				ref={containerRef}
				className="relative flex-1 justify-center items-center flex"
			>
				<div className="text-gray-11">Loading video...</div>
			</div>
		);
	}

	const padding = 4;
	const containerAspect =
		containerBounds && containerBounds.width && containerBounds.height
			? (containerBounds.width - padding * 2) / (containerBounds.height - padding * 2)
			: 1;
	const frameAspect = videoData.width / videoData.height;

	let size: { width: number; height: number };
	if (frameAspect < containerAspect) {
		const height = (containerBounds?.height ?? 0) - padding * 1;
		size = {
			width: height * frameAspect,
			height,
		};
	} else {
		const width = (containerBounds?.width ?? 0) - padding * 2;
		size = {
			width,
			height: width / frameAspect,
		};
	}

	return (
		<div
			ref={containerRef}
			className="relative flex-1 justify-center items-center flex"
		>
			<div className="flex overflow-hidden absolute inset-0 justify-center items-center h-full">
				<video
					ref={videoRef}
					src={videoUrl}
					className="hidden"
					preload="metadata"
				/>
				<canvas
					ref={canvasRef}
					style={{
						width: `${size.width - padding * 2}px`,
						height: `${size.height}px`,
						...gridStyle,
					}}
					className="rounded"
					width={videoData.width}
					height={videoData.height}
				/>
			</div>
		</div>
	);
}

function Time({
	seconds,
	fps,
	className,
}: {
	seconds: number;
	fps?: number;
	className?: string;
}) {
	return (
		<span className={cx("text-gray-11 text-sm tabular-nums", className)}>
			{formatTime(seconds, fps ?? FPS)}
		</span>
	);
}
