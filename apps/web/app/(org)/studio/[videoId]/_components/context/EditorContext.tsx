"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";

// Types matching desktop editor
export type RGBColor = [number, number, number];

export type BackgroundSource =
	| { type: "wallpaper"; name: string }
	| { type: "image"; url: string }
	| { type: "color"; color: RGBColor }
	| { type: "gradient"; from: RGBColor; to: RGBColor };

export type CameraShape = "square" | "source";

export type StereoMode = "stereo" | "monoL" | "monoR";

export type TimelineSegment = {
	start: number;
	end: number;
	timescale: number;
	recordingSegment?: number;
};

export type ZoomSegment = {
	start: number;
	end: number;
	zoom: number;
	x: number;
	y: number;
};

export type SceneSegment = {
	start: number;
	end: number;
	position: { x: number; y: number };
	size: { x: number; y: number };
};

export type ProjectConfiguration = {
	background: {
		source: BackgroundSource;
		crop?: {
			position: { x: number; y: number };
			size: { x: number; y: number };
		};
	};
	camera: {
		hide: boolean;
		shape: CameraShape;
		position: { x: number; y: number };
		size: { x: number; y: number };
		shadow: boolean;
	};
	audio: {
		microphone: { volume: number; enabled: boolean };
		system: { volume: number; enabled: boolean };
		stereoMode: StereoMode;
	};
	cursor: {
		hide: boolean;
		size: number;
		style: string;
	};
	timeline: {
		segments: TimelineSegment[];
		zoomSegments: ZoomSegment[];
		sceneSegments: SceneSegment[];
	};
};

export type EditorState = {
	playing: boolean;
	playbackTime: number;
	previewTime: number | null;
	timeline: {
		transform: {
			position: number;
			zoom: number;
		};
		selection: {
			type: "clip" | "zoom" | "scene";
			indices: number[];
		} | null;
		interactMode: "normal" | "split";
		hoveredTrack: string | null;
	};
};

export const FPS = 60;
export const OUTPUT_SIZE = { x: 1920, y: 1080 };

interface EditorContextValue {
	videoId: string;
	userId: string;
	project: ProjectConfiguration;
	setProject: (updater: (project: ProjectConfiguration) => ProjectConfiguration) => void;
	editorState: EditorState;
	setEditorState: (updater: (state: EditorState) => EditorState) => void;
	videoUrl: string | null;
	videoDuration: number;
	projectActions: {
		splitClipSegment: (time: number) => void;
		deleteClipSegment: (index: number) => void;
		splitZoomSegment: (index: number, time: number) => void;
		deleteZoomSegments: (indices: number[]) => void;
		splitSceneSegment: (index: number, time: number) => void;
		deleteSceneSegment: (index: number) => void;
	};
	history: {
		canUndo: () => boolean;
		canRedo: () => boolean;
		undo: () => void;
		redo: () => void;
	};
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorContextProvider({
	videoId,
	userId,
	children,
}: {
	videoId: string;
	userId: string;
	children: ReactNode;
}) {
	const [project, setProjectState] = useState<ProjectConfiguration>({
		background: {
			source: { type: "color", color: [0, 0, 0] },
		},
		camera: {
			hide: false,
			shape: "square",
			position: { x: 0, y: 0 },
			size: { x: 200, y: 200 },
			shadow: true,
		},
		audio: {
			microphone: { volume: 1, enabled: true },
			system: { volume: 1, enabled: true },
			stereoMode: "stereo",
		},
		cursor: {
			hide: false,
			size: 1,
			style: "default",
		},
		timeline: {
			segments: [],
			zoomSegments: [],
			sceneSegments: [],
		},
	});

	const [editorState, setEditorStateState] = useState<EditorState>({
		playing: false,
		playbackTime: 0,
		previewTime: null,
		timeline: {
			transform: {
				position: 0,
				zoom: 10,
			},
			selection: null,
			interactMode: "normal",
			hoveredTrack: null,
		},
	});

	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [videoDuration, setVideoDuration] = useState(0);
	const [history, setHistory] = useState<{
		past: ProjectConfiguration[];
		future: ProjectConfiguration[];
	}>({
		past: [],
		future: [],
	});

	// Load video
	useEffect(() => {
		// TODO: Load video from API
		// For now, placeholder
		async function loadVideo() {
			try {
				// Fetch video URL from API
				const response = await fetch(`/api/video/${videoId}`);
				if (response.ok) {
					const data = await response.json();
					setVideoUrl(data.url);
					setVideoDuration(data.duration || 0);
				}
			} catch (error) {
				console.error("Failed to load video:", error);
			}
		}
		loadVideo();
	}, [videoId]);

	const setProject = useCallback(
		(updater: (project: ProjectConfiguration) => ProjectConfiguration) => {
			setProjectState((prev) => {
				const next = updater(prev);
				setHistory((h) => ({
					past: [...h.past, prev],
					future: [],
				}));
				return next;
			});
		},
		[],
	);

	const setEditorState = useCallback(
		(updater: (state: EditorState) => EditorState) => {
			setEditorStateState(updater);
		},
		[],
	);

	const projectActions = {
		splitClipSegment: (time: number) => {
			setProject((project) => {
				const segments = [...project.timeline.segments];
				let searchTime = time;
				let prevDuration = 0;
				const currentSegmentIndex = segments.findIndex((segment) => {
					const duration = segment.end - segment.start;
					if (searchTime > duration) {
						searchTime -= duration;
						prevDuration += duration;
						return false;
					}
					return true;
				});

				if (currentSegmentIndex === -1) return project;
				const segment = segments[currentSegmentIndex];

				segments.splice(currentSegmentIndex + 1, 0, {
					...segment,
					start: segment.start + searchTime,
					end: segment.end,
				});
				segments[currentSegmentIndex] = {
					...segments[currentSegmentIndex],
					end: segment.start + searchTime,
				};

				return {
					...project,
					timeline: {
						...project.timeline,
						segments,
					},
				};
			});
		},
		deleteClipSegment: (index: number) => {
			setProject((project) => {
				const segments = [...project.timeline.segments];
				const segment = segments[index];
				if (
					!segment ||
					segment.recordingSegment === undefined ||
					segments.filter((s) => s.recordingSegment === segment.recordingSegment)
						.length < 2
				) {
					return project;
				}
				segments.splice(index, 1);
				return {
					...project,
					timeline: {
						...project.timeline,
						segments,
					},
				};
			});
		},
		splitZoomSegment: (index: number, time: number) => {
			setProject((project) => {
				const segments = [...project.timeline.zoomSegments];
				const segment = segments[index];
				if (!segment) return project;

				const newLengths = [segment.end - segment.start - time, time];
				if (newLengths.some((l) => l < 1)) return project;

				segments.splice(index + 1, 0, {
					...segment,
					start: segment.start + time,
					end: segment.end,
				});
				segments[index] = {
					...segments[index],
					end: segment.start + time,
				};

				return {
					...project,
					timeline: {
						...project.timeline,
						zoomSegments: segments,
					},
				};
			});
		},
		deleteZoomSegments: (indices: number[]) => {
			setProject((project) => {
				const segments = [...project.timeline.zoomSegments];
				const sorted = [...new Set(indices)]
					.filter((i) => Number.isInteger(i) && i >= 0 && i < segments.length)
					.sort((a, b) => b - a);
				if (sorted.length === 0) return project;
				for (const i of sorted) segments.splice(i, 1);
				return {
					...project,
					timeline: {
						...project.timeline,
						zoomSegments: segments,
					},
				};
			});
		},
		splitSceneSegment: (index: number, time: number) => {
			setProject((project) => {
				const segments = [...project.timeline.sceneSegments];
				const segment = segments[index];
				if (!segment) return project;

				const newLengths = [segment.end - segment.start - time, time];
				if (newLengths.some((l) => l < 1)) return project;

				segments.splice(index + 1, 0, {
					...segment,
					start: segment.start + time,
					end: segment.end,
				});
				segments[index] = {
					...segments[index],
					end: segment.start + time,
				};

				return {
					...project,
					timeline: {
						...project.timeline,
						sceneSegments: segments,
					},
				};
			});
		},
		deleteSceneSegment: (index: number) => {
			setProject((project) => {
				const segments = [...project.timeline.sceneSegments];
				segments.splice(index, 1);
				return {
					...project,
					timeline: {
						...project.timeline,
						sceneSegments: segments,
					},
				};
			});
		},
	};

	const historyActions = useMemo(() => ({
		canUndo: () => history.past.length > 0,
		canRedo: () => history.future.length > 0,
		undo: () => {
			setHistory((h) => {
				if (h.past.length === 0) return h;
				const previous = h.past[h.past.length - 1];
				setProjectState(previous);
				return {
					past: h.past.slice(0, -1),
					future: [project, ...h.future],
				};
			});
		},
		redo: () => {
			setHistory((h) => {
				if (h.future.length === 0) return h;
				const next = h.future[0];
				setProjectState(next);
				return {
					past: [...h.past, project],
					future: h.future.slice(1),
				};
			});
		},
	}), [history, project]);

	return (
		<EditorContext.Provider
			value={{
				videoId,
				userId,
				project,
				setProject,
				editorState,
				setEditorState,
				videoUrl,
				videoDuration,
				projectActions,
				history: historyActions,
			}}
		>
			{children}
		</EditorContext.Provider>
	);
}

export function useEditorContext() {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error("useEditorContext must be used within EditorContextProvider");
	}
	return context;
}


