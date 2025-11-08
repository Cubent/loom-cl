"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectConfiguration, XY, FramesRendered, ProjectRecordingsMeta } from "../types";
import { usePresets } from "../utils/presets";
import { useCustomDomainQuery } from "../utils/customDomain";
import { useProgressBar } from "../utils/progressBar";
import { getDefaultProjectConfig } from "../utils/defaultProjectConfig";

export type CurrentDialog =
	| { type: "createPreset" }
	| { type: "renamePreset"; presetIndex: number }
	| { type: "deletePreset"; presetIndex: number }
	| { type: "crop"; position: XY<number>; size: XY<number> }
	| { type: "export" };

export type DialogState = { open: false } | ({ open: boolean } & CurrentDialog);

export const FPS = 60;

export const OUTPUT_SIZE = {
	x: 1920,
	y: 1080,
};

export const MAX_ZOOM_IN = 3;

export type RenderState =
	| { type: "starting" }
	| { type: "rendering"; progress: FramesRendered };

export type CustomDomainResponse = {
	custom_domain: string | null;
	domain_verified: boolean | null;
};

export type VideoData = {
	id: string;
	name: string;
	duration: number;
	width: number;
	height: number;
	fps: number;
	url: string;
};

type EditorState = {
	previewTime: number | null;
	playbackTime: number;
	playing: boolean;
	timeline: {
		interactMode: "seek" | "split";
		selection: null | { type: "zoom"; indices: number[] } | { type: "clip"; indices: number[] } | { type: "scene"; indices: number[] };
		transform: {
			zoom: number;
			position: number;
		};
		hoveredTrack: null | "clip" | "zoom" | "scene";
	};
};

type ExportState =
	| { type: "idle" }
	| ({ action: "copy" } & (RenderState | { type: "copying" } | { type: "done" }))
	| ({ action: "save" } & (RenderState | { type: "copying" } | { type: "done" }))
	| ({ action: "upload" } & (RenderState | { type: "uploading"; progress: number } | { type: "done" }));

interface EditorContextValue {
	videoData: VideoData | null;
	videoUrl: string | null;
	videoDuration: number;
	project: ProjectConfiguration;
	setProject: React.Dispatch<React.SetStateAction<ProjectConfiguration>>;
	projectActions: {
		splitClipSegment: (time: number) => void;
		deleteClipSegment: (segmentIndex: number) => void;
		splitZoomSegment: (index: number, time: number) => void;
		deleteZoomSegments: (segmentIndices: number[]) => void;
		splitSceneSegment: (index: number, time: number) => void;
		deleteSceneSegment: (segmentIndex: number) => void;
		setClipSegmentTimescale: (index: number, timescale: number) => void;
	};
	projectHistory: {
		undo: () => void;
		redo: () => void;
		canUndo: () => boolean;
		canRedo: () => boolean;
		pause: () => () => void;
		isPaused: () => boolean;
	};
	editorState: EditorState;
	setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
	totalDuration: number;
	zoomOutLimit: number;
	dialog: DialogState;
	setDialog: React.Dispatch<React.SetStateAction<DialogState>>;
	exportState: ExportState;
	setExportState: React.Dispatch<React.SetStateAction<ExportState>>;
	micWaveforms: number[][] | null;
	systemAudioWaveforms: number[][] | null;
	customDomain: ReturnType<typeof useCustomDomainQuery>;
	presets: ReturnType<typeof usePresets>;
	refetchVideo: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorContextProviderProps {
	children: ReactNode;
	videoId: string;
	userId: string;
}

function useProjectHistory(project: ProjectConfiguration, setProject: React.Dispatch<React.SetStateAction<ProjectConfiguration>>) {
	const [history, setHistory] = useState<{ past: ProjectConfiguration[]; future: ProjectConfiguration[] }>({
		past: [],
		future: [],
	});
	const [pauseCount, setPauseCount] = useState(0);
	const prevProjectRef = useRef<ProjectConfiguration>(project);

	useEffect(() => {
		if (pauseCount > 0) return;
		const prevProject = prevProjectRef.current;
		if (JSON.stringify(prevProject) !== JSON.stringify(project)) {
			setHistory((h) => ({
				past: [...h.past, prevProject],
				future: [],
			}));
			prevProjectRef.current = project;
		}
	}, [project, pauseCount]);

	const undo = useCallback(() => {
		setHistory((h) => {
			if (h.past.length === 0) return h;
			const previous = h.past[h.past.length - 1];
			setProject(previous);
			prevProjectRef.current = previous;
			return {
				past: h.past.slice(0, -1),
				future: [project, ...h.future],
			};
		});
	}, [project, setProject]);

	const redo = useCallback(() => {
		setHistory((h) => {
			if (h.future.length === 0) return h;
			const next = h.future[0];
			setProject(next);
			prevProjectRef.current = next;
			return {
				past: [...h.past, project],
				future: h.future.slice(1),
			};
		});
	}, [project, setProject]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.code) {
				case "KeyZ": {
					if (!(e.ctrlKey || e.metaKey)) return;
					if (e.shiftKey) redo();
					else undo();
					break;
				}
				case "KeyY": {
					if (!(e.ctrlKey || e.metaKey)) return;
					redo();
					break;
				}
				default: {
					return;
				}
			}
			e.preventDefault();
			e.stopPropagation();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [undo, redo]);

	return {
		undo,
		redo,
		canUndo: () => history.past.length > 0,
		canRedo: () => history.future.length > 0,
		pause: () => {
			setPauseCount((c) => c + 1);
			return () => {
				setPauseCount((c) => c - 1);
			};
		},
		isPaused: () => pauseCount > 0,
	};
}

export function EditorContextProvider({ children, videoId, userId }: EditorContextProviderProps) {
	const videoQuery = useQuery<VideoData>({
		queryKey: ["video", videoId],
		queryFn: async () => {
			const response = await fetch(`/api/video/${videoId}`);
			if (!response.ok) throw new Error("Failed to fetch video");
			return response.json();
		},
	});

	const videoData = videoQuery.data ?? null;
	const videoUrl = videoData?.url ?? null;
	const videoDuration = videoData?.duration ?? 0;

	const [project, setProject] = useState<ProjectConfiguration>(() => {
		if (videoData) {
			return getDefaultProjectConfig(videoDuration);
		}
		return getDefaultProjectConfig(0);
	});

	useEffect(() => {
		if (videoData) {
			setProject(getDefaultProjectConfig(videoDuration));
		}
	}, [videoData, videoDuration]);

	const projectHistory = useProjectHistory(project, setProject);

	const [editorState, setEditorState] = useState<EditorState>(() => {
		const zoomOutLimit = Math.min(videoDuration, 60 * 10);
		return {
			previewTime: null,
			playbackTime: 0,
			playing: false,
			timeline: {
				interactMode: "seek",
				selection: null,
				transform: {
					zoom: zoomOutLimit,
					position: 0,
				},
				hoveredTrack: null,
			},
		};
	});

	const totalDuration = useMemo(() => {
		return (
			project.timeline?.segments.reduce((acc, s) => acc + (s.end - s.start) / s.timescale, 0) ?? videoDuration
		);
	}, [project.timeline, videoDuration]);

	const zoomOutLimit = useMemo(() => Math.min(totalDuration, 60 * 10), [totalDuration]);

	function updateZoom(state: { zoom: number; position: number }, newZoom: number, origin: number): { zoom: number; position: number } {
		const zoom = Math.max(Math.min(newZoom, zoomOutLimit), MAX_ZOOM_IN);
		const visibleOrigin = origin - state.position;
		const originPercentage = Math.min(1, visibleOrigin / state.zoom);
		const newVisibleOrigin = zoom * originPercentage;
		const newPosition = origin - newVisibleOrigin;
		return { zoom, position: newPosition };
	}

	useEffect(() => {
		setEditorState((prev) => ({
			...prev,
			timeline: {
				...prev.timeline,
				transform: {
					...prev.timeline.transform,
					zoom: zoomOutLimit,
				},
			},
		}));
	}, [zoomOutLimit]);

	const projectActions = useMemo(
		() => ({
			splitClipSegment: (time: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const segments = [...(prev.timeline.segments ?? [])];
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
					if (currentSegmentIndex === -1) return prev;
					const segment = segments[currentSegmentIndex];
					segments.splice(currentSegmentIndex + 1, 0, {
						...segment,
						start: segment.start + searchTime,
						end: segment.end,
					});
					segments[currentSegmentIndex] = { ...segments[currentSegmentIndex], end: segment.start + searchTime };
					return {
						...prev,
						timeline: {
							...prev.timeline,
							segments,
						},
					};
				});
			},
			deleteClipSegment: (segmentIndex: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const segment = prev.timeline.segments[segmentIndex];
					if (
						!segment ||
						segment.recordingSegment === undefined ||
						prev.timeline.segments.filter((s) => s.recordingSegment === segment.recordingSegment).length < 2
					)
						return prev;
					const segments = [...prev.timeline.segments];
					segments.splice(segmentIndex, 1);
					return {
						...prev,
						timeline: {
							...prev.timeline,
							segments,
						},
					};
				});
				setEditorState((prev) => ({
					...prev,
					timeline: {
						...prev.timeline,
						selection: null,
					},
				}));
			},
			splitZoomSegment: (index: number, time: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const zoomSegments = [...(prev.timeline.zoomSegments ?? [])];
					const segment = zoomSegments[index];
					if (!segment) return prev;
					const newLengths = [segment.end - segment.start - time, time];
					if (newLengths.some((l) => l < 1)) return prev;
					zoomSegments.splice(index + 1, 0, {
						...segment,
						start: segment.start + time,
						end: segment.end,
					});
					zoomSegments[index] = { ...zoomSegments[index], end: segment.start + time };
					return {
						...prev,
						timeline: {
							...prev.timeline,
							zoomSegments,
						},
					};
				});
			},
			deleteZoomSegments: (segmentIndices: number[]) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const zoomSegments = [...(prev.timeline.zoomSegments ?? [])];
					const sorted = [...new Set(segmentIndices)]
						.filter((i) => Number.isInteger(i) && i >= 0 && i < zoomSegments.length)
						.sort((a, b) => b - a);
					if (sorted.length === 0) return prev;
					for (const i of sorted) zoomSegments.splice(i, 1);
					return {
						...prev,
						timeline: {
							...prev.timeline,
							zoomSegments,
						},
					};
				});
				setEditorState((prev) => ({
					...prev,
					timeline: {
						...prev.timeline,
						selection: null,
					},
				}));
			},
			splitSceneSegment: (index: number, time: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const sceneSegments = [...(prev.timeline.sceneSegments ?? [])];
					const segment = sceneSegments[index];
					if (!segment) return prev;
					const newLengths = [segment.end - segment.start - time, time];
					if (newLengths.some((l) => l < 1)) return prev;
					sceneSegments.splice(index + 1, 0, {
						...segment,
						start: segment.start + time,
						end: segment.end,
					});
					sceneSegments[index] = { ...sceneSegments[index], end: segment.start + time };
					return {
						...prev,
						timeline: {
							...prev.timeline,
							sceneSegments,
						},
					};
				});
			},
			deleteSceneSegment: (segmentIndex: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const sceneSegments = [...(prev.timeline.sceneSegments ?? [])];
					sceneSegments.splice(segmentIndex, 1);
					return {
						...prev,
						timeline: {
							...prev.timeline,
							sceneSegments,
						},
					};
				});
				setEditorState((prev) => ({
					...prev,
					timeline: {
						...prev.timeline,
						selection: null,
					},
				}));
			},
			setClipSegmentTimescale: (index: number, timescale: number) => {
				setProject((prev) => {
					if (!prev.timeline) return prev;
					const timeline = { ...prev.timeline };
					const segment = timeline.segments[index];
					if (!segment) return prev;
					const currentLength = (segment.end - segment.start) / segment.timescale;
					const nextLength = (segment.end - segment.start) / timescale;
					const lengthDiff = nextLength - currentLength;
					const absoluteStart = timeline.segments.reduce((acc, curr, i) => {
						if (i >= index) return acc;
						return acc + (curr.end - curr.start) / curr.timescale;
					}, 0);
					const diff = (v: number) => {
						const d = (lengthDiff * (v - absoluteStart)) / currentLength;
						if (v > absoluteStart + currentLength) return lengthDiff;
						else if (v > absoluteStart) return d;
						else return 0;
					};
					const zoomSegments = timeline.zoomSegments.map((zs) => ({
						...zs,
						start: zs.start + diff(zs.start),
						end: zs.end + diff(zs.end),
					}));
					const segments = [...timeline.segments];
					segments[index] = { ...segments[index], timescale };
					return {
						...prev,
						timeline: {
							...timeline,
							segments,
							zoomSegments,
						},
					};
				});
			},
		}),
		[],
	);

	const [dialog, setDialog] = useState<DialogState>({ open: false });
	const [exportState, setExportState] = useState<ExportState>({ type: "idle" });

	useProgressBar(() => {
		if (exportState && "type" in exportState && exportState.type === "rendering") {
			return (exportState.progress.renderedCount / exportState.progress.totalFrames) * 100;
		}
		return undefined;
	});

	const micWaveformsQuery = useQuery<number[][]>({
		queryKey: ["micWaveforms", videoId],
		queryFn: async () => {
			// TODO: Implement API endpoint for waveforms
			return [];
		},
		enabled: false, // Disabled until API is implemented
	});

	const systemAudioWaveformsQuery = useQuery<number[][]>({
		queryKey: ["systemAudioWaveforms", videoId],
		queryFn: async () => {
			// TODO: Implement API endpoint for waveforms
			return [];
		},
		enabled: false, // Disabled until API is implemented
	});

	const customDomain = useCustomDomainQuery();
	const presets = usePresets();

	const value: EditorContextValue = useMemo(
		() => ({
			videoData,
			videoUrl,
			videoDuration,
			project,
			setProject,
			projectActions,
			projectHistory,
			editorState,
			setEditorState,
			totalDuration,
			zoomOutLimit,
			dialog,
			setDialog,
			exportState,
			setExportState,
			micWaveforms: micWaveformsQuery.data ?? null,
			systemAudioWaveforms: systemAudioWaveformsQuery.data ?? null,
			customDomain,
			presets,
			refetchVideo: () => videoQuery.refetch(),
		}),
		[
			videoData,
			videoUrl,
			videoDuration,
			project,
			projectActions,
			projectHistory,
			editorState,
			totalDuration,
			zoomOutLimit,
			dialog,
			exportState,
			micWaveformsQuery.data,
			systemAudioWaveformsQuery.data,
			customDomain,
			presets,
			videoQuery,
		],
	);

	return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error("useEditorContext must be used within EditorContextProvider");
	}
	return context;
}
