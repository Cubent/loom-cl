// Types for web editor - extracted from desktop tauri.ts

export type XY<T> = { x: T; y: T };

export type AspectRatio = "wide" | "vertical" | "square" | "classic" | "tall";

export type BackgroundSource =
	| { type: "wallpaper"; path: string | null }
	| { type: "image"; path: string | null }
	| { type: "color"; value: [number, number, number]; alpha?: number }
	| { type: "gradient"; from: [number, number, number]; to: [number, number, number]; angle?: number };

export type ShadowConfiguration = { size: number; opacity: number; blur: number };

export type BorderConfiguration = { enabled: boolean; width: number; color: [number, number, number]; opacity: number };

export type Crop = { position: XY<number>; size: XY<number> };

export type BackgroundConfiguration = {
	source: BackgroundSource;
	blur: number;
	padding: number;
	rounding: number;
	inset: number;
	crop: Crop | null;
	shadow?: number;
	advancedShadow?: ShadowConfiguration | null;
	border?: BorderConfiguration | null;
};

export type CameraPosition = { x: CameraXPosition; y: CameraYPosition };
export type CameraXPosition = "left" | "center" | "right";
export type CameraYPosition = "top" | "bottom";
export type CameraShape = "square" | "source";

export type Camera = {
	hide: boolean;
	mirror: boolean;
	position: CameraPosition;
	size: number;
	zoom_size: number | null;
	rounding?: number;
	shadow?: number;
	advanced_shadow?: ShadowConfiguration | null;
	shape?: CameraShape;
};

export type StereoMode = "stereo" | "monoL" | "monoR";

export type AudioConfiguration = {
	mute: boolean;
	improve: boolean;
	micVolumeDb?: number;
	micStereoMode?: StereoMode;
	systemVolumeDb?: number;
};

export type CursorType = "pointer" | "circle";
export type CursorAnimationStyle = "regular" | "slow" | "fast";

export type CursorConfiguration = {
	hide?: boolean;
	hideWhenIdle?: boolean;
	hideWhenIdleDelay?: number;
	size: number;
	type: CursorType;
	animationStyle: CursorAnimationStyle;
	tension: number;
	mass: number;
	friction: number;
	raw?: boolean;
	motionBlur?: number;
	useSvg?: boolean;
};

export type HotkeysConfiguration = { show: boolean };

export type TimelineSegment = { recordingSegment?: number; timescale: number; start: number; end: number };

export type ZoomMode = "auto" | { manual: { x: number; y: number } };

export type ZoomSegment = { start: number; end: number; amount: number; mode: ZoomMode };

export type SceneMode = "default" | "cameraOnly" | "hideCamera";

export type SceneSegment = { start: number; end: number; mode?: SceneMode };

export type TimelineConfiguration = {
	segments: TimelineSegment[];
	zoomSegments: ZoomSegment[];
	sceneSegments?: SceneSegment[];
};

export type CaptionSegment = { id: string; start: number; end: number; text: string };

export type CaptionSettings = {
	enabled: boolean;
	font: string;
	size: number;
	color: string;
	backgroundColor: string;
	backgroundOpacity: number;
	position: string;
	bold: boolean;
	italic: boolean;
	outline: boolean;
	outlineColor: string;
	exportWithSubtitles: boolean;
};

export type CaptionsData = { segments: CaptionSegment[]; settings: CaptionSettings };

export type ClipOffsets = { camera?: number; mic?: number; system_audio?: number };

export type ClipConfiguration = { index: number; offsets: ClipOffsets };

export type ProjectConfiguration = {
	aspectRatio: AspectRatio | null;
	background: BackgroundConfiguration;
	camera: Camera;
	audio: AudioConfiguration;
	cursor: CursorConfiguration;
	hotkeys: HotkeysConfiguration;
	timeline?: TimelineConfiguration | null;
	captions?: CaptionsData | null;
	clips?: ClipConfiguration[];
};

export type Video = { duration: number; width: number; height: number; fps: number; start_time: number };

export type VideoMeta = { path: string; fps?: number; start_time?: number | null };

export type AudioMeta = { path: string; start_time?: number | null };

export type SingleSegment = { display: VideoMeta; camera?: VideoMeta | null; audio?: AudioMeta | null; cursor?: string | null };

export type MultipleSegment = {
	display: VideoMeta;
	camera?: VideoMeta | null;
	mic?: AudioMeta | null;
	system_audio?: AudioMeta | null;
	cursor?: string | null;
};

export type StudioRecordingMeta = { segment: SingleSegment } | { inner: MultipleSegments };

export type MultipleSegments = {
	segments: MultipleSegment[];
	cursors: { [key: string]: string } | { [key: string]: { imagePath: string; hotspot: XY<number>; shape?: string | null } };
	status?: { status: "InProgress" } | { status: "Failed"; error: string } | { status: "Complete" } | null;
};

export type SegmentRecordings = { display: Video; camera: Video | null; mic: Audio | null; system_audio: Audio | null };

export type ProjectRecordingsMeta = { segments: SegmentRecordings[] };

export type SerializedEditorInstance = {
	framesSocketUrl: string;
	recordingDuration: number;
	savedProjectConfig: ProjectConfiguration;
	recordings: ProjectRecordingsMeta;
	path: string;
	videoId?: string; // Added for web
};

export type RecordingMeta = (StudioRecordingMeta | { fps: number; sample_rate: number | null }) & {
	platform?: "MacOS" | "Windows" | null;
	pretty_name: string;
	sharing?: { id: string; link: string } | null;
	upload?: any | null;
};

export type FramesRendered = { renderedCount: number; totalFrames: number; type: "FramesRendered" };

export type Preset = { name: string; config: ProjectConfiguration };

export type PresetsStore = { presets: Preset[]; default: number | null };

// Export types
export type ExportCompression = "Minimal" | "Social" | "Web" | "Potato";

export type ExportFormat = "Mp4" | "Gif";

export type ExportSettings = {
	format: ExportFormat;
	fps: number;
	resolution_base: XY<number>;
	compression?: ExportCompression;
	quality?: number | null;
};

export type UploadProgress = { progress: number };

export type RenderState =
	| { type: "starting" }
	| { type: "rendering"; progress: FramesRendered };

