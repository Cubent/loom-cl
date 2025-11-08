"use client";

import { createContext, useContext, ReactNode } from "react";

const MAX_TIMELINE_MARKINGS = 20;
const TIMELINE_MARKING_RESOLUTIONS = [0.5, 1, 2.5, 5, 10, 30];

interface TimelineContextValue {
	duration: number;
	secsPerPixel: number;
	timelineBounds: DOMRect | null;
	markingResolution: () => number;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

export function TimelineContextProvider({
	children,
	duration,
	secsPerPixel,
	timelineBounds,
	zoom,
}: {
	children: ReactNode;
	duration: number;
	secsPerPixel: number;
	timelineBounds: DOMRect | null;
	zoom: number;
}) {
	const markingResolution = () => {
		return (
			TIMELINE_MARKING_RESOLUTIONS.find((r) => zoom / r <= MAX_TIMELINE_MARKINGS) ?? 30
		);
	};

	return (
		<TimelineContext.Provider
			value={{
				duration,
				secsPerPixel,
				timelineBounds,
				markingResolution,
			}}
		>
			{children}
		</TimelineContext.Provider>
	);
}

export function useTimelineContext() {
	const context = useContext(TimelineContext);
	if (!context) {
		throw new Error("useTimelineContext must be used within TimelineContextProvider");
	}
	return context;
}

interface TrackContextValue {
	secsPerPixel: () => number;
	trackBounds: DOMRect | null;
	trackState: {
		draggingSegment: boolean;
	};
	setTrackState: (updater: (state: { draggingSegment: boolean }) => { draggingSegment: boolean }) => void;
}

const TrackContext = createContext<TrackContextValue | null>(null);

export function TrackContextProvider({
	children,
	secsPerPixel,
	trackBounds,
	trackState,
	setTrackState,
}: {
	children: ReactNode;
	secsPerPixel: () => number;
	trackBounds: DOMRect | null;
	trackState: { draggingSegment: boolean };
	setTrackState: (updater: (state: { draggingSegment: boolean }) => { draggingSegment: boolean }) => void;
}) {
	return (
		<TrackContext.Provider
			value={{
				secsPerPixel,
				trackBounds,
				trackState,
				setTrackState,
			}}
		>
			{children}
		</TrackContext.Provider>
	);
}

export function useTrackContext() {
	const context = useContext(TrackContext);
	if (!context) {
		throw new Error("useTrackContext must be used within TrackContextProvider");
	}
	return context;
}

interface SegmentContextValue {
	width: () => number;
}

const SegmentContext = createContext<SegmentContextValue | null>(null);

export function SegmentContextProvider({
	children,
	width,
}: {
	children: ReactNode;
	width: () => number;
}) {
	return (
		<SegmentContext.Provider value={{ width }}>
			{children}
		</SegmentContext.Provider>
	);
}

export function useSegmentContext() {
	const context = useContext(SegmentContext);
	if (!context) {
		throw new Error("useSegmentContext must be used within SegmentContextProvider");
	}
	return context;
}

