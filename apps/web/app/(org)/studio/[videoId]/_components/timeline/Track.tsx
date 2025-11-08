"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
import { TrackContextProvider, useTrackContext } from "./context";
import { useTimelineContext } from "./context";
import { SegmentContextProvider, useSegmentContext } from "./context";
import { useEditorContext } from "../context/EditorContext";

export function TrackRoot({
	children,
	onMouseEnter,
	onMouseLeave,
	onMouseDown,
	onContextMenu,
	ref: refProp,
}: {
	children: ReactNode;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	onMouseDown?: (e: React.MouseEvent) => void;
	onContextMenu?: (e: React.MouseEvent) => void;
	ref?: React.Ref<HTMLDivElement>;
}) {
	const [ref, setRef] = useState<HTMLDivElement | null>(null);
	const [trackBounds, setTrackBounds] = useState<DOMRect | null>(null);
	const [trackState, setTrackState] = useState({ draggingSegment: false });
	const { editorState } = useEditorContext();
	const { secsPerPixel } = useTimelineContext();

	useEffect(() => {
		if (!ref) return;
		const updateBounds = () => {
			setTrackBounds(ref.getBoundingClientRect());
		};
		updateBounds();
		const resizeObserver = new ResizeObserver(updateBounds);
		resizeObserver.observe(ref);
		return () => resizeObserver.disconnect();
	}, [ref]);

	const trackSecsPerPixel = useMemo(() => {
		if (!trackBounds) return () => 0;
		return () => {
			if (!trackBounds) return 0;
			return editorState.timeline.transform.zoom / trackBounds.width;
		};
	}, [trackBounds, editorState.timeline.transform.zoom]);

	return (
		<TrackContextProvider
			secsPerPixel={trackSecsPerPixel}
			trackBounds={trackBounds}
			trackState={trackState}
			setTrackState={setTrackState}
		>
			<div
				ref={(el) => {
					setRef(el);
					if (refProp && typeof refProp === "function") refProp(el);
					else if (refProp) (refProp as React.MutableRefObject<HTMLDivElement | null>).current = el;
				}}
				className="flex flex-row relative h-[3.25rem]"
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseDown={onMouseDown}
				onContextMenu={onContextMenu}
			>
				{children}
			</div>
		</TrackContextProvider>
	);
}

export function useSegmentTranslateX(
	segment: { start: number; end: number },
	transform: { position: number; zoom: number },
	secsPerPixel: number,
) {
	return useMemo(() => {
		const base = transform.position;
		const delta = segment.start;
		return (delta - base) / secsPerPixel;
	}, [segment.start, transform.position, secsPerPixel]);
}

export function useSegmentWidth(
	segment: { start: number; end: number },
	secsPerPixel: number,
) {
	return useMemo(() => (segment.end - segment.start) / secsPerPixel, [segment.start, segment.end, secsPerPixel]);
}

export function SegmentRoot({
	children,
	innerClass,
	segment,
	onMouseDown,
	className,
	style,
}: {
	children: ReactNode;
	innerClass: string;
	segment: { start: number; end: number };
	onMouseDown?: (e: React.MouseEvent) => void;
	className?: string;
	style?: React.CSSProperties;
}) {
	const { editorState } = useEditorContext();
	const { secsPerPixel } = useTimelineContext();
	const translateX = useSegmentTranslateX(segment, editorState.timeline.transform, secsPerPixel);
	const width = useSegmentWidth(segment, secsPerPixel);

	return (
		<SegmentContextProvider width={() => width}>
			<div
				className={`absolute overflow-hidden border rounded-xl inset-y-0 ${
					editorState.timeline.interactMode === "split" ? "timeline-scissors-cursor" : ""
				} ${className || ""}`}
				style={{
					transform: `translateX(${translateX}px)`,
					width: `${width}px`,
					...style,
				}}
				onMouseDown={onMouseDown}
			>
				<div className={`h-full flex flex-row rounded-xl overflow-hidden group ${innerClass}`}>
					{children}
				</div>
			</div>
		</SegmentContextProvider>
	);
}

export function SegmentContent({ children, className }: { children: ReactNode; className?: string }) {
	const { width } = useSegmentContext();
	const widthValue = typeof width === "function" ? width() : width;
	return (
		<div
			className={`relative w-full h-full flex flex-row items-center py-[0.25rem] ${
				widthValue < 100 ? "px-0" : "px-[0.5rem]"
			} ${className || ""}`}
		>
			{children}
		</div>
	);
}

export function SegmentHandle({
	position,
	onMouseDown,
	className,
}: {
	position: "start" | "end";
	onMouseDown?: (e: React.MouseEvent) => void;
	className?: string;
}) {
	const { width } = useSegmentContext();
	const widthValue = typeof width === "function" ? width() : width;
	const hidden = widthValue < 80;

	return (
		<div
			className={`w-3 cursor-col-resize transition-opacity h-full flex flex-row items-center ${
				position === "start" ? "left-0 justify-end" : "right-0 justify-start"
			} ${hidden ? "opacity-0" : "opacity-0 group-hover:opacity-100"} ${className || ""}`}
			data-hidden={hidden}
			onMouseDown={onMouseDown}
		>
			<div className="w-[3px] h-8 bg-white rounded-full" />
		</div>
	);
}

