"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useEditorContext, FPS } from "../context/EditorContext";
import { TimelineContextProvider, useTimelineContext } from "./context";
import { ClipTrack } from "./ClipTrack";
import { ZoomTrack, type ZoomSegmentDragState } from "./ZoomTrack";
import { SceneTrack, type SceneSegmentDragState } from "./SceneTrack";

const TIMELINE_PADDING = 16;

function formatTime(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	} else {
		return `${seconds}s`;
	}
}

function TimelineMarkings() {
	const { editorState } = useEditorContext();
	const { secsPerPixel, markingResolution } = useTimelineContext();
	const transform = editorState.timeline.transform;

	const timelineMarkings = useMemo(() => {
		const diff = transform.position % markingResolution();
		return Array.from(
			{ length: 2 + Math.ceil((transform.zoom + 5) / markingResolution()) },
			(_, i) => transform.position - diff + i * markingResolution(),
		);
	}, [transform.position, transform.zoom, markingResolution]);

	return (
		<div className="relative h-4 text-xs text-gray-11">
			{timelineMarkings.map((second, i) => {
				if (second <= 0) return null;
				return (
					<div
						key={i}
						className="absolute left-0 bottom-1 w-1 h-1 text-center bg-current rounded-full"
						style={{
							transform: `translateX(${(second - transform.position) / secsPerPixel - 1}px)`,
						}}
					>
						{second % 1 === 0 && (
							<div className="absolute -top-[1.125rem] -translate-x-1/2">
								{formatTime(second)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

export function Timeline() {
	const {
		project,
		setProject,
		editorState,
		setEditorState,
		videoDuration,
		projectActions,
	} = useEditorContext();

	const duration = videoDuration;
	const transform = editorState.timeline.transform;
	const [timelineRef, setTimelineRef] = useState<HTMLDivElement | null>(null);
	const [timelineBounds, setTimelineBounds] = useState<DOMRect | null>(null);

	useEffect(() => {
		if (!timelineRef) return;
		const updateBounds = () => {
			setTimelineBounds(timelineRef.getBoundingClientRect());
		};
		updateBounds();
		const resizeObserver = new ResizeObserver(updateBounds);
		resizeObserver.observe(timelineRef);
		return () => resizeObserver.disconnect();
	}, [timelineRef]);

	const secsPerPixel = useMemo(() => {
		if (!timelineBounds || timelineBounds.width === 0) return 0;
		return transform.zoom / timelineBounds.width;
	}, [transform.zoom, timelineBounds]);

	useEffect(() => {
		if (!project.timeline.segments || project.timeline.segments.length === 0) {
			setProject((p) => ({
				...p,
				timeline: {
					...p.timeline,
					segments: [{ start: 0, end: duration, timescale: 1 }],
				},
			}));
		}
	}, [project.timeline.segments, duration, setProject]);

	useEffect(() => {
		if (timelineBounds && timelineBounds.width > 0) {
			const minSegmentPixels = 80;
			const secondsPerPixel = 1 / minSegmentPixels;
			const desiredZoom = timelineBounds.width * secondsPerPixel;

			if (transform.zoom > desiredZoom) {
				setEditorState((s) => ({
					...s,
					timeline: {
						...s.timeline,
						transform: {
							...s.timeline.transform,
							zoom: desiredZoom,
						},
					},
				}));
			}
		}
	}, [timelineBounds, transform.zoom, setEditorState]);

	let zoomSegmentDragState: ZoomSegmentDragState = { type: "idle" };
	let sceneSegmentDragState: SceneSegmentDragState = { type: "idle" };

	const handleUpdatePlayhead = useCallback((e: MouseEvent) => {
		if (!timelineBounds) return;
		if (zoomSegmentDragState.type !== "idle" || sceneSegmentDragState.type !== "idle") return;

		const rawTime = secsPerPixel * (e.clientX - timelineBounds.left) + transform.position;
		const newTime = Math.min(Math.max(0, rawTime), duration);

		if (editorState.playing) {
			// For web, we'll just update the playback time
			// In a real implementation, you'd seek the video element
		}

		setEditorState((s) => ({
			...s,
			playbackTime: newTime,
		}));
	}, [timelineBounds, secsPerPixel, transform.position, duration, editorState.playing, setEditorState]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const hasNoModifiers = !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;

			if (e.code === "Backspace" || (e.code === "Delete" && hasNoModifiers)) {
				const selection = editorState.timeline.selection;
				if (!selection) return;

				if (selection.type === "zoom") {
					projectActions.deleteZoomSegments(selection.indices);
				} else if (selection.type === "clip") {
					[...selection.indices].sort((a, b) => b - a).forEach((idx) => {
						projectActions.deleteClipSegment(idx);
					});
				} else if (selection.type === "scene") {
					[...selection.indices].sort((a, b) => b - a).forEach((idx) => {
						projectActions.deleteSceneSegment(idx);
					});
				}
			} else if (e.code === "KeyC" && hasNoModifiers) {
				const time = editorState.previewTime ?? editorState.playbackTime;
				if (time === null || time === undefined) return;
				projectActions.splitClipSegment(time);
			} else if (e.code === "Escape" && hasNoModifiers) {
				setEditorState((s) => ({
					...s,
					timeline: { ...s.timeline, selection: null },
				}));
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [editorState.timeline.selection, editorState.previewTime, editorState.playbackTime, projectActions, setEditorState]);

	const split = editorState.timeline.interactMode === "split";

	return (
		<TimelineContextProvider
			duration={duration}
			secsPerPixel={secsPerPixel}
			timelineBounds={timelineBounds}
			zoom={transform.zoom}
		>
			<div
				className="pt-8 relative overflow-hidden flex flex-col gap-2"
				style={{
					paddingLeft: `${TIMELINE_PADDING}px`,
					paddingRight: `${TIMELINE_PADDING}px`,
				}}
				onMouseDown={(e) => {
					const handleMouseUp = () => {
						handleUpdatePlayhead(e as unknown as MouseEvent);
						if (zoomSegmentDragState.type === "idle") {
							setEditorState((s) => ({
								...s,
								timeline: { ...s.timeline, selection: null },
							}));
						}
						window.removeEventListener("mouseup", handleMouseUp);
					};
					window.addEventListener("mouseup", handleMouseUp);
				}}
				onMouseMove={(e) => {
					if (!timelineBounds) return;
					if (editorState.playing) return;
					const newPreviewTime = transform.position + secsPerPixel * (e.clientX - timelineBounds.left);
					setEditorState((s) => ({
						...s,
						previewTime: newPreviewTime,
					}));
				}}
				onMouseEnter={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: null } }))}
				onMouseLeave={() => {
					setEditorState((s) => ({
						...s,
						previewTime: null,
					}));
				}}
				onWheel={(e) => {
					if (e.ctrlKey || e.metaKey) {
						const zoomDelta = (e.deltaY * Math.sqrt(transform.zoom)) / 30;
						const newZoom = transform.zoom + zoomDelta;
						const centerTime = editorState.previewTime ?? editorState.playbackTime;
						setEditorState((s) => ({
							...s,
							timeline: {
								...s.timeline,
								transform: {
									...s.timeline.transform,
									zoom: Math.max(1, Math.min(100, newZoom)),
								},
							},
						}));
					} else {
						let delta = 0;
						if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5) {
							delta = e.deltaX;
						} else {
							delta = e.deltaY;
						}
						const newPosition = transform.position + secsPerPixel * delta;
						setEditorState((s) => ({
							...s,
							timeline: {
								...s.timeline,
								transform: {
									...s.timeline.transform,
									position: Math.max(0, newPosition),
								},
							},
						}));
					}
				}}
			>
				<TimelineMarkings />
				{!editorState.playing && editorState.previewTime !== null && (
					<div
						className={`flex absolute bottom-0 top-4 left-5 z-10 justify-center items-center w-px pointer-events-none bg-gradient-to-b to-[120%] ${
							split ? "from-red-300" : "from-gray-400"
						}`}
						style={{
							left: `${TIMELINE_PADDING}px`,
							transform: `translateX(${(editorState.previewTime - transform.position) / secsPerPixel - 0.5}px)`,
						}}
					>
						<div className={`absolute -top-2 rounded-full size-3 ${split ? "bg-red-300" : "bg-gray-10"}`} />
					</div>
				)}
				<div
					className={`absolute bottom-0 top-4 h-full rounded-full z-10 w-px pointer-events-none bg-gradient-to-b to-[120%] from-[rgb(226,64,64)] ${
						split && "opacity-50"
					}`}
					style={{
						left: `${TIMELINE_PADDING}px`,
						transform: `translateX(${Math.min(
							(editorState.playbackTime - transform.position) / secsPerPixel,
							timelineBounds?.width ?? 0,
						)}px)`,
					}}
				>
					<div className="size-3 bg-[rgb(226,64,64)] rounded-full -mt-2 -ml-[calc(0.37rem-0.5px)]" />
				</div>
				<ClipTrack
					ref={setTimelineRef}
					handleUpdatePlayhead={handleUpdatePlayhead}
				/>
				<ZoomTrack
					onDragStateChanged={(v) => {
						zoomSegmentDragState = v;
					}}
					handleUpdatePlayhead={handleUpdatePlayhead}
				/>
				{!project.camera.hide && (
					<SceneTrack
						onDragStateChanged={(v) => {
							sceneSegmentDragState = v;
						}}
						handleUpdatePlayhead={handleUpdatePlayhead}
					/>
				)}
			</div>
		</TimelineContextProvider>
	);
}

