"use client";

import { useRef, useState, useEffect } from "react";
import { useEditorContext, FPS } from "./context/EditorContext";

export function EditorTimeline() {
	const {
		editorState,
		setEditorState,
		project,
		projectActions,
		videoDuration,
	} = useEditorContext();
	const timelineRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const transform = editorState.timeline.transform;
	const secsPerPixel = transform.zoom / (timelineRef.current?.clientWidth || 1);

	const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!timelineRef.current) return;
		const rect = timelineRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const newTime = transform.position + secsPerPixel * x;
		setEditorState((state) => ({
			...state,
			playbackTime: Math.max(0, Math.min(newTime, videoDuration)),
		}));
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		if (e.ctrlKey || e.metaKey) {
			// Zoom
			const zoomDelta = (e.deltaY * Math.sqrt(transform.zoom)) / 30;
			const newZoom = Math.max(1, Math.min(100, transform.zoom + zoomDelta));
			setEditorState((state) => ({
				...state,
				timeline: {
					...state.timeline,
					transform: {
						...state.timeline.transform,
						zoom: newZoom,
					},
				},
			}));
		} else {
			// Scroll
			const delta = e.deltaY;
			const newPosition = transform.position + secsPerPixel * delta;
			setEditorState((state) => ({
				...state,
				timeline: {
					...state.timeline,
					transform: {
						...state.timeline.transform,
						position: Math.max(0, newPosition),
					},
				},
			}));
		}
	};

	return (
		<div
			ref={timelineRef}
			className="relative h-48 bg-gray-2 rounded-lg overflow-hidden border border-gray-3"
			onClick={handleTimelineClick}
			onWheel={handleWheel}
		>
			{/* Timeline markings */}
			<div className="absolute inset-0 flex items-center">
				{Array.from({ length: Math.ceil(videoDuration) }).map((_, i) => (
					<div
						key={i}
						className="absolute border-l border-gray-4"
						style={{
							left: `${(i - transform.position) / secsPerPixel}px`,
						}}
					>
						<span className="text-xs text-gray-11 ml-1">{i}s</span>
					</div>
				))}
			</div>

			{/* Playhead */}
			<div
				className="absolute top-0 bottom-0 w-0.5 bg-red-9 z-10 pointer-events-none"
				style={{
					left: `${(editorState.playbackTime - transform.position) / secsPerPixel}px`,
				}}
			>
				<div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-9 rounded-full" />
			</div>

			{/* Clip segments */}
			<div className="absolute inset-0 pt-8">
				{project.timeline.segments.map((segment, index) => (
					<div
						key={index}
						className="absolute h-8 bg-blue-9 rounded border border-blue-10 cursor-pointer hover:bg-blue-10"
						style={{
							left: `${(segment.start - transform.position) / secsPerPixel}px`,
							width: `${(segment.end - segment.start) / secsPerPixel}px`,
						}}
						onDoubleClick={() => projectActions.deleteClipSegment(index)}
					/>
				))}
			</div>

			{/* Zoom segments */}
			<div className="absolute inset-0 pt-20">
				{project.timeline.zoomSegments.map((segment, index) => (
					<div
						key={index}
						className="absolute h-8 bg-purple-9 rounded border border-purple-10 cursor-pointer hover:bg-purple-10"
						style={{
							left: `${(segment.start - transform.position) / secsPerPixel}px`,
							width: `${(segment.end - segment.start) / secsPerPixel}px`,
						}}
						onDoubleClick={() => projectActions.deleteZoomSegments([index])}
					/>
				))}
			</div>
		</div>
	);
}

