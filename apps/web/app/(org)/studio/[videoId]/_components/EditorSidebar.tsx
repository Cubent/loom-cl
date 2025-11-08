"use client";

import { NumberField } from "~/components/NumberField";
import {
	Collapsible,
	Collapsible as KCollapsible,
	RadioGroup as KRadioGroup,
	RadioGroup,
	Select as KSelect,
	Tabs as KTabs,
} from "~/components/kobalte-compat";
import { cx } from "cva";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Toggle } from "~/components/Toggle";
import type {
	BackgroundSource,
	CameraShape,
	ClipOffsets,
	SceneSegment,
	StereoMode,
	TimelineSegment,
	ZoomSegment,
} from "../types";
import {
	Monitor,
	Sparkles,
	Timer,
	Volume2,
	Image as ImageIcon,
	Camera,
	MousePointer2,
	MessageSquare,
	ChevronDown,
	Mic,
	Maximize2,
	Circle as BlurIcon,
	XCircle,
	CheckCircle2,
	Trash2,
	Check,
	Move as Bezier,
	Square,
	CornerUpLeft,
	Settings,
	Circle as ShadowIcon,
} from "lucide-react";
import { CaptionsTab } from "./tabs/CaptionsTab";
import { useEditorContext } from "./context/EditorContext";
import {
	DEFAULT_GRADIENT_FROM,
	DEFAULT_GRADIENT_TO,
	type RGBColor,
} from "./projectConfig";
import ShadowSettings from "./ShadowSettings";
import { TextInput } from "./TextInput";
import {
	ComingSoonTooltip,
	EditorButton,
	Field,
	MenuItem,
	MenuItemList,
	PopperContent,
	Slider,
	Subfield,
	topSlideAnimateClasses,
} from "./ui";

const BACKGROUND_SOURCES = {
	wallpaper: "Wallpaper",
	image: "Image",
	color: "Color",
	gradient: "Gradient",
} satisfies Record<BackgroundSource["type"], string>;

const BACKGROUND_SOURCES_LIST = [
	"wallpaper",
	"image",
	"color",
	"gradient",
] satisfies Array<BackgroundSource["type"]>;

const BACKGROUND_COLORS = [
	"#FF0000", // Red
	"#FF4500", // Orange-Red
	"#FF8C00", // Orange
	"#FFD700", // Gold
	"#FFFF00", // Yellow
	"#ADFF2F", // Green-Yellow
	"#32CD32", // Lime Green
	"#008000", // Green
	"#00CED1", // Dark Turquoise
	"#4785FF", // Dodger Blue
	"#0000FF", // Blue
	"#4B0082", // Indigo
	"#800080", // Purple
	"#A9A9A9", // Dark Gray
	"#FFFFFF", // White
	"#000000", // Black
	"#00000000", // Transparent
];

const BACKGROUND_GRADIENTS = [
	{ from: [15, 52, 67], to: [52, 232, 158] }, // Dark Blue to Teal
	{ from: [34, 193, 195], to: [253, 187, 45] }, // Turquoise to Golden Yellow
	{ from: [29, 253, 251], to: [195, 29, 253] }, // Cyan to Purple
	{ from: [69, 104, 220], to: [176, 106, 179] }, // Blue to Violet
	{ from: [106, 130, 251], to: [252, 92, 125] }, // Soft Blue to Pinkish Red
	{ from: [131, 58, 180], to: [253, 29, 29] }, // Purple to Red
	{ from: [249, 212, 35], to: [255, 78, 80] }, // Yellow to Coral Red
	{ from: [255, 94, 0], to: [255, 42, 104] }, // Orange to Reddish Pink
	{ from: [255, 0, 150], to: [0, 204, 255] }, // Pink to Sky Blue
	{ from: [0, 242, 96], to: [5, 117, 230] }, // Green to Blue
	{ from: [238, 205, 163], to: [239, 98, 159] }, // Peach to Soft Pink
	{ from: [44, 62, 80], to: [52, 152, 219] }, // Dark Gray Blue to Light Blue
	{ from: [168, 239, 255], to: [238, 205, 163] }, // Light Blue to Peach
	{ from: [74, 0, 224], to: [143, 0, 255] }, // Deep Blue to Bright Purple
	{ from: [252, 74, 26], to: [247, 183, 51] }, // Deep Orange to Soft Yellow
	{ from: [0, 255, 255], to: [255, 20, 147] }, // Cyan to Deep Pink
	{ from: [255, 127, 0], to: [255, 255, 0] }, // Orange to Yellow
	{ from: [255, 0, 255], to: [0, 255, 0] }, // Magenta to Green
] satisfies Array<{ from: RGBColor; to: RGBColor }>;

const STEREO_MODES = [
	{ name: "Stereo", value: "stereo" },
	{ name: "Mono L", value: "monoL" },
	{ name: "Mono R", value: "monoR" },
] satisfies Array<{ name: string; value: StereoMode }>;

const CAMERA_SHAPES = [
	{
		name: "Square",
		value: "square",
	},
	{
		name: "Source",
		value: "source",
	},
] satisfies Array<{ name: string; value: CameraShape }>;

const TAB_IDS = {
	background: "background",
	camera: "camera",
	audio: "audio",
	cursor: "cursor",
	hotkeys: "hotkeys",
} as const;

type TabId = "background" | "camera" | "transcript" | "audio" | "cursor" | "hotkeys" | "captions";

export function EditorSidebar() {
	const {
		project,
		setProject,
		setEditorState,
		projectActions,
		videoData,
		editorState,
		meta,
	} = useEditorContext();

	const cursorIdleDelay = useMemo(() => {
		return ((project.cursor as { hideWhenIdleDelay?: number }).hideWhenIdleDelay ?? 2) as number;
	}, [project.cursor]);

	const clampIdleDelay = (value: number) =>
		Math.round(Math.min(5, Math.max(0.5, value)) * 10) / 10;

	const [selectedTab, setSelectedTab] = useState<TabId>("background");
	const scrollRef = useRef<HTMLDivElement>(null);

	const tabs = useMemo(() => {
		const tabsList = [
			{ id: TAB_IDS.background, icon: ImageIcon },
			{
				id: TAB_IDS.camera,
				icon: Camera,
				disabled: videoData?.hasCamera === false,
			},
			{ id: TAB_IDS.audio, icon: Volume2 },
			{
				id: TAB_IDS.cursor,
				icon: MousePointer2,
				disabled: !(meta?.type === "multiple" && (meta as any).segments?.[0]?.cursor),
			},
			// @ts-ignore - window.FLAGS may not exist
			(typeof window !== "undefined" && window.FLAGS?.captions) && {
				id: "captions" as const,
				icon: MessageSquare,
			},
		].filter(Boolean) as Array<{ id: TabId; icon: React.ComponentType<any>; disabled?: boolean }>;
		return tabsList;
	}, [videoData, meta]);

	return (
		<KTabs
			value={editorState.timeline.selection ? undefined : selectedTab}
			className="flex flex-col min-h-0 shrink-0 flex-1 max-w-[26rem] overflow-hidden rounded-xl z-10 bg-gray-1 dark:bg-gray-2 border border-gray-3"
		>
			<KTabs.List className="flex overflow-hidden sticky top-0 z-[60] flex-row items-center h-16 text-lg border-b border-gray-3 shrink-0 bg-gray-1 dark:bg-gray-2">
				{tabs.map((item) => {
					const IconComponent = item.icon;
					return (
						<KTabs.Trigger
							key={item.id}
							value={item.id}
							className={cx(
								"flex relative z-10 flex-1 justify-center items-center px-4 py-2 transition-colors group disabled:opacity-50 focus:outline-none",
								editorState.timeline.selection
									? "text-gray-11"
									: "text-gray-11 ui-selected:text-gray-12",
							)}
							onClick={() => {
								// Clear any active selection first
								if (editorState.timeline.selection) {
									setEditorState((prev) => ({
										...prev,
										timeline: {
											...prev.timeline,
											selection: null,
										},
									}));
								}
								setSelectedTab(item.id);
								if (scrollRef.current) {
									scrollRef.current.scrollTo({
										top: 0,
									});
								}
							}}
							disabled={item.disabled}
						>
							<div
								className={cx(
									"flex justify-center relative border-transparent border z-10 items-center rounded-md size-9 transition will-change-transform",
									selectedTab !== item.id &&
										"group-hover:border-gray-300 group-disabled:border-none",
								)}
							>
								<IconComponent />
							</div>
						</KTabs.Trigger>
					);
				})}

				{!editorState.timeline.selection && (
					<KTabs.Indicator className="absolute top-0 left-0 w-full h-full transition-transform duration-200 ease-in-out pointer-events-none will-change-transform">
						<div className="absolute top-1/2 left-1/2 rounded-lg transform -translate-x-1/2 -translate-y-1/2 bg-gray-3 will-change-transform size-9" />
					</KTabs.Indicator>
				)}
			</KTabs.List>
			<div
				ref={scrollRef}
				style={{
					"--margin-top-scroll": "5px",
				} as React.CSSProperties}
				className={cx(
					"custom-scroll overflow-x-hidden overflow-y-scroll text-[0.875rem] flex-1 min-h-0",
					editorState.timeline.selection && "hidden",
				)}
			>
				<BackgroundConfig scrollRef={scrollRef.current} />
				<CameraConfig scrollRef={scrollRef.current} />
				<KTabs.Content
					value="audio"
					className="flex flex-col flex-1 gap-6 p-4 min-h-0"
				>
					<Field
						name="Audio Controls"
						icon={<Volume2 className="size-4" />}
					>
						<Subfield name="Mute Audio">
							<Toggle
								checked={project.audio.mute}
								onChange={(v) => setProject((prev) => ({ ...prev, audio: { ...prev.audio, mute: v } }))}
							/>
						</Subfield>
						{videoData?.hasMicrophone && (
							<Subfield name="Microphone Stereo Mode">
								<KSelect<{ name: string; value: StereoMode }>
									options={STEREO_MODES}
									optionValue="value"
									optionTextValue="name"
									value={STEREO_MODES.find(
										(v) => v.value === project.audio.micStereoMode,
									)}
									onChange={(v) => {
										if (v) setProject((prev) => ({ ...prev, audio: { ...prev.audio, micStereoMode: v.value } }));
									}}
									disallowEmptySelection
									itemComponent={(props) => (
										<MenuItem
											as={KSelect.Item}
											item={props.item}
										>
											<KSelect.ItemLabel className="flex-1">
												{props.item.rawValue.name}
											</KSelect.ItemLabel>
										</MenuItem>
									)}
								>
									<KSelect.Trigger className="flex flex-row gap-2 items-center px-2 w-full h-8 rounded-lg transition-colors bg-gray-3 disabled:text-gray-11">
										<KSelect.Value<{
											name: string;
											value: StereoMode;
										}> className="flex-1 text-sm text-left truncate text-[--gray-500] font-normal">
											{(state) => <span>{state.selectedOption().name}</span>}
										</KSelect.Value>
										<KSelect.Icon
											as={(props: any) => (
												<ChevronDown
													{...props}
													className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180 text-[--gray-500]"
												/>
											)}
										/>
									</KSelect.Trigger>
									<KSelect.Portal>
										<PopperContent
											as={KSelect.Content}
											className={cx(topSlideAnimateClasses, "z-50")}
										>
											<MenuItemList
												className="overflow-y-auto max-h-32"
												as={KSelect.Listbox}
											/>
										</PopperContent>
									</KSelect.Portal>
								</KSelect>
							</Subfield>
						)}
					</Field>
					{meta?.hasMicrophone && (
						<Field
							name="Microphone Volume"
							icon={<Mic className="size-4" />}
						>
							<Slider
								disabled={project.audio.mute}
								value={[project.audio.micVolumeDb ?? 0]}
								onChange={(v) => setProject((prev) => ({ ...prev, audio: { ...prev.audio, micVolumeDb: v[0] } }))}
								minValue={-30}
								maxValue={10}
								step={0.1}
								formatTooltip={(v) =>
									v <= -30 ? "Muted" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`
								}
							/>
						</Field>
					)}
					{meta?.hasSystemAudio && (
						<Field
							name="System Audio Volume"
							icon={<Monitor className="size-4" />}
						>
							<Slider
								disabled={project.audio.mute}
								value={[project.audio.systemVolumeDb ?? 0]}
								onChange={(v) => setProject((prev) => ({ ...prev, audio: { ...prev.audio, systemVolumeDb: v[0] } }))}
								minValue={-30}
								maxValue={10}
								step={0.1}
								formatTooltip={(v) =>
									v <= -30 ? "Muted" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`
								}
							/>
						</Field>
					)}
				</KTabs.Content>
				<KTabs.Content
					value="cursor"
					className="flex flex-col flex-1 gap-6 p-4 min-h-0"
				>
					<Field
						name="Cursor"
						icon={<MousePointer2 className="size-4" />}
						value={
							<Toggle
								checked={!project.cursor.hide}
								onChange={(v) => {
									setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, hide: !v } }));
								}}
							/>
						}
					/>
					{!project.cursor.hide && (
						<>
							<Field name="Size" icon={<Maximize2 className="size-4" />}>
								<Slider
									value={[project.cursor.size]}
									onChange={(v) => setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, size: v[0] } }))}
									minValue={20}
									maxValue={300}
									step={1}
								/>
							</Field>
							<Field
								name="Hide When Idle"
								icon={<Timer className="size-4" />}
								value={
									<Toggle
										checked={project.cursor.hideWhenIdle}
										onChange={(value) =>
											setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, hideWhenIdle: value } }))
										}
									/>
								}
							/>
							{project.cursor.hideWhenIdle && (
								<Subfield name="Inactivity Delay" className="gap-4 items-center">
									<div className="flex flex-1 gap-3 items-center">
										<Slider
											className="flex-1"
											value={[cursorIdleDelay]}
											onChange={(v) => {
												const rounded = clampIdleDelay(v[0]);
												setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, hideWhenIdleDelay: rounded } }));
											}}
											minValue={0.5}
											maxValue={5}
											step={0.1}
											formatTooltip={(value) => `${value.toFixed(1)}s`}
										/>
										<span className="w-12 text-xs text-right text-gray-11">
											{cursorIdleDelay.toFixed(1)}s
										</span>
									</div>
								</Subfield>
							)}
							<KCollapsible open={!project.cursor.raw}>
								<Field
									name="Smooth Movement"
									icon={<Bezier className="size-4" />}
									value={
										<Toggle
											checked={!project.cursor.raw}
											onChange={(value) =>
												setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, raw: !value } }))
											}
										/>
									}
								/>
								<KCollapsible.Content className="overflow-hidden opacity-0 transition-opacity animate-collapsible-up ui-expanded:animate-collapsible-down ui-expanded:opacity-100">
									<Subfield name="Smoothness" className="gap-4 items-center">
										<div className="flex flex-1 gap-3 items-center">
											<Slider
												className="flex-1"
												value={[project.cursor.smoothness ?? 0.5]}
												onChange={(v) =>
													setProject((prev) => ({ ...prev, cursor: { ...prev.cursor, smoothness: v[0] } }))
												}
												minValue={0}
												maxValue={1}
												step={0.01}
												formatTooltip={(value) => `${(value * 100).toFixed(0)}%`}
											/>
											<span className="w-12 text-xs text-right text-gray-11">
												{((project.cursor.smoothness ?? 0.5) * 100).toFixed(0)}%
											</span>
										</div>
									</Subfield>
								</KCollapsible.Content>
							</KCollapsible>
						</>
					)}
				</KTabs.Content>
				{typeof window !== "undefined" && (window as any).FLAGS?.captions && (
					<KTabs.Content
						value="captions"
						className="flex flex-col flex-1 gap-6 p-4 min-h-0"
					>
						<CaptionsTab />
					</KTabs.Content>
				)}
			</div>
		</KTabs>
	);
}

// Helper functions
function rgbToHex(rgb: [number, number, number]): string {
	return `#${rgb
		.map((c) => c.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number, number] | null {
	// Support both 6-digit (RGB) and 8-digit (RGBA) hex colors
	const match = hex.match(
		/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i,
	);
	if (!match) return null;

	const [, r, g, b, a] = match;
	const rgb = [
		Number.parseInt(r, 16),
		Number.parseInt(g, 16),
		Number.parseInt(b, 16),
	] as const;

	// If alpha is provided, return RGBA tuple
	if (a) {
		return [...rgb, Number.parseInt(a, 16)];
	}

	return [...rgb, 255];
}

const CHECKERED_BUTTON_BACKGROUND = `url("data:image/svg+xml,%3Csvg width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='8' fill='%23a0a0a0'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23a0a0a0'/%3E%3C/svg%3E")`;

const WALLPAPER_NAMES = [
	// macOS wallpapers
	"macOS/tahoe-dusk-min",
	"macOS/tahoe-dawn-min",
	"macOS/tahoe-day-min",
	"macOS/tahoe-night-min",
	"macOS/tahoe-dark",
	"macOS/tahoe-light",
	"macOS/sequoia-dark",
	"macOS/sequoia-light",
	"macOS/sonoma-clouds",
	"macOS/sonoma-dark",
	"macOS/sonoma-evening",
	"macOS/sonoma-fromabove",
	"macOS/sonoma-horizon",
	"macOS/sonoma-light",
	"macOS/sonoma-river",
	"macOS/ventura-dark",
	"macOS/ventura-semi-dark",
	"macOS/ventura",
	// Blue wallpapers
	"blue/1",
	"blue/2",
	"blue/3",
	"blue/4",
	"blue/5",
	"blue/6",
	// Purple wallpapers
	"purple/1",
	"purple/2",
	"purple/3",
	"purple/4",
	"purple/5",
	"purple/6",
	// Dark wallpapers
	"dark/1",
	"dark/2",
	"dark/3",
	"dark/4",
	"dark/5",
	"dark/6",
	// Orange wallpapers
	"orange/1",
	"orange/2",
	"orange/3",
	"orange/4",
	"orange/5",
	"orange/6",
	"orange/7",
	"orange/8",
	"orange/9",
] as const;

const BACKGROUND_THEMES = {
	macOS: "macOS",
	dark: "Dark",
	blue: "Blue",
	purple: "Purple",
	orange: "Orange",
} as const;

// RgbInput component
function RgbInput({
	value,
	onChange,
}: {
	value: [number, number, number];
	onChange: (value: [number, number, number]) => void;
}) {
	const [text, setText] = useState(() => rgbToHex(value));
	const prevHexRef = useRef(rgbToHex(value));
	const colorInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setText(rgbToHex(value));
		prevHexRef.current = rgbToHex(value);
	}, [value]);

	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const hexValue = e.target.value;
		const rgbValue = hexToRgb(hexValue);
		if (!rgbValue) return;

		const [r, g, b] = rgbValue;
		onChange([r, g, b]);
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newText = e.target.value;
		setText(newText);

		const rgbValue = hexToRgb(newText);
		if (rgbValue) {
			const [r, g, b] = rgbValue;
			onChange([r, g, b]);
		}
	};

	const handleBlur = () => {
		const rgbValue = hexToRgb(text);
		if (rgbValue) {
			const [r, g, b] = rgbValue;
			onChange([r, g, b]);
		} else {
			setText(prevHexRef.current);
			const fallbackValue = hexToRgb(text);
			if (fallbackValue) {
				const [r, g, b] = fallbackValue;
				onChange([r, g, b]);
			}
		}
	};

	const handleFocus = () => {
		prevHexRef.current = rgbToHex(value);
	};

	return (
		<div className="flex flex-row items-center gap-[0.75rem] relative">
			<button
				type="button"
				className="size-[2rem] rounded-[0.5rem]"
				style={{
					backgroundColor: rgbToHex(value),
				}}
				onClick={() => colorInputRef.current?.click()}
			/>
			<input
				ref={colorInputRef}
				type="color"
				className="absolute left-0 bottom-0 w-[3rem] opacity-0"
				value={rgbToHex(value)}
				onChange={handleColorChange}
			/>
			<TextInput
				className="w-[4.60rem] p-[0.375rem] text-gray-12 text-[13px] border rounded-[0.5rem] bg-gray-1 outline-none focus:ring-1 transition-shadows duration-200 focus:ring-gray-500 focus:ring-offset-1 focus:ring-offset-gray-200"
				value={text}
				onFocus={handleFocus}
				onChange={handleTextChange}
				onBlur={handleBlur}
			/>
		</div>
	);
}

// BackgroundConfig component - Step 2: Converting main structure
function BackgroundConfig({ scrollRef }: { scrollRef: HTMLDivElement | null }) {
	const { project, setProject, projectHistory } = useEditorContext();
	const [backgroundTab, setBackgroundTab] = useState<keyof typeof BACKGROUND_THEMES>("macOS");
	const [wallpapers, setWallpapers] = useState<Array<{ id: string; url: string; rawPath: string }>>([]);
	const [wallpapersLoading, setWallpapersLoading] = useState(true);
	const [scrollX, setScrollX] = useState(0);
	const [reachedEndOfScroll, setReachedEndOfScroll] = useState(false);
	const backgroundRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load wallpapers for web (using public assets)
	useEffect(() => {
		const loadWallpapers = async () => {
			setWallpapersLoading(true);
			try {
				// For web, we'll use public assets or API
				// TODO: Implement wallpaper loading from public assets or API
				const loadedWallpapers = WALLPAPER_NAMES.map((id) => ({
					id,
					url: `/backgrounds/${id}.jpg`, // Public asset path
					rawPath: id, // Use ID as path for web
				}));
				setWallpapers(loadedWallpapers);
			} catch (err) {
				console.error("Failed to load wallpapers:", err);
			} finally {
				setWallpapersLoading(false);
			}
		};
		loadWallpapers();
	}, []);

	// Handle scroll for background tabs
	useEffect(() => {
		const el = backgroundRef.current;
		if (!el) return;

		const handleScroll = () => {
			setScrollX(el.scrollLeft);
			const reachedEnd = el.scrollWidth - el.clientWidth - el.scrollLeft;
			setReachedEndOfScroll(reachedEnd === 0);
		};

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
		};

		el.addEventListener("scroll", handleScroll);
		el.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			el.removeEventListener("scroll", handleScroll);
			el.removeEventListener("wheel", handleWheel);
		};
	}, []);

	const ensurePaddingForBackground = useCallback(() => {
		if (project.background.padding === 0) {
			setProject((prev) => ({ ...prev, background: { ...prev.background, padding: 10 } }));
		}
	}, [project.background.padding, setProject]);

	const filteredWallpapers = useMemo(() => {
		return wallpapers.filter((wp) => wp.id.startsWith(backgroundTab)) || [];
	}, [wallpapers, backgroundTab]);

	const debouncedSetProject = useCallback(
		(wallpaperPath: string) => {
			const resumeHistory = projectHistory.pause();
			queueMicrotask(() => {
				setProject((prev) => ({
					...prev,
					background: {
						...prev.background,
						source: {
							type: "wallpaper",
							path: wallpaperPath,
						} as const,
					},
				}));
				resumeHistory();
			});
		},
		[setProject, projectHistory],
	);

	const backgrounds = useMemo(
		() => ({
			wallpaper: {
				type: "wallpaper",
				path: null,
			},
			image: {
				type: "image",
				path: null,
			},
			color: {
				type: "color",
				value: DEFAULT_GRADIENT_FROM,
			},
			gradient: {
				type: "gradient",
				from: DEFAULT_GRADIENT_FROM,
				to: DEFAULT_GRADIENT_TO,
			},
		}),
		[],
	);

	return (
		<KTabs.Content value={TAB_IDS.background} className="flex flex-col gap-6 p-4">
			<Field icon={<ImageIcon className="size-4" />} name="Background Image">
				<KTabs
					value={project.background.source.type}
					onChange={(v) => {
						const tab = v as BackgroundSource["type"];
						ensurePaddingForBackground();
						switch (tab) {
							case "image": {
								setProject((prev) => ({
									...prev,
									background: {
										...prev.background,
										source: {
											type: "image",
											path:
												prev.background.source.type === "image"
													? prev.background.source.path
													: null,
										},
									},
								}));
								break;
							}
							case "color": {
								setProject((prev) => ({
									...prev,
									background: {
										...prev.background,
										source: {
											type: "color",
											value:
												prev.background.source.type === "color"
													? prev.background.source.value
													: DEFAULT_GRADIENT_FROM,
										},
									},
								}));
								break;
							}
							case "gradient": {
								setProject((prev) => ({
									...prev,
									background: {
										...prev.background,
										source: {
											type: "gradient",
											from:
												prev.background.source.type === "gradient"
													? prev.background.source.from
													: DEFAULT_GRADIENT_FROM,
											to:
												prev.background.source.type === "gradient"
													? prev.background.source.to
													: DEFAULT_GRADIENT_TO,
											angle:
												prev.background.source.type === "gradient"
													? prev.background.source.angle
													: 90,
										},
									},
								}));
								break;
							}
							case "wallpaper": {
								setProject((prev) => ({
									...prev,
									background: {
										...prev.background,
										source: {
											type: "wallpaper",
											path:
												prev.background.source.type === "wallpaper"
													? prev.background.source.path
													: null,
										},
									},
								}));
								break;
							}
						}
					}}
				>
					<KTabs.List className="flex flex-row gap-2 items-center rounded-[0.5rem] relative">
						{BACKGROUND_SOURCES_LIST.map((item) => {
							const getGradientBackground = () => {
								const angle =
									project.background.source.type === "gradient"
										? project.background.source.angle
										: 90;
								const fromColor =
									project.background.source.type === "gradient"
										? project.background.source.from
										: DEFAULT_GRADIENT_FROM;
								const toColor =
									project.background.source.type === "gradient"
										? project.background.source.to
										: DEFAULT_GRADIENT_TO;

								return (
									<div
										className="size-3.5 rounded"
										style={{
											background: `linear-gradient(${angle}deg, rgb(${fromColor.join(", ")}), rgb(${toColor.join(", ")}))`,
										}}
									/>
								);
							};

							const getColorBackground = () => {
								const backgroundColor =
									project.background.source.type === "color"
										? project.background.source.value
										: hexToRgb(BACKGROUND_COLORS[9])?.slice(0, 3) || [0, 0, 0];

								return (
									<div
										className="size-3.5 rounded-[5px]"
										style={{
											backgroundColor: `rgb(${backgroundColor.join(", ")})`,
										}}
									/>
								);
							};

							const getImageBackground = () => {
								// For web, use placeholder icons or actual image URLs
								let imageSrc: string = "";
								if (item === "image") {
									if (
										project.background.source.type === "image" &&
										project.background.source.path
									) {
										// For web, path might be a URL or blob URL
										imageSrc = project.background.source.path;
									} else {
										// Use data URI for transparent placeholder to avoid 404 streaming errors
										imageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Crect width='14' height='14' fill='%23f0f0f0'/%3E%3C/svg%3E";
									}
								} else if (item === "wallpaper") {
									if (
										project.background.source.type === "wallpaper" &&
										project.background.source.path
									) {
										const selectedWallpaper = wallpapers.find((w) =>
											project.background.source.path?.includes(w.id),
										);
										if (selectedWallpaper?.url) {
											imageSrc = selectedWallpaper.url;
										} else {
											// Use data URI for image placeholder to avoid 404 streaming errors
											imageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Crect width='14' height='14' fill='%23e0e0e0'/%3E%3C/svg%3E";
										}
									} else {
										// Use data URI for image placeholder to avoid 404 streaming errors
										imageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Crect width='14' height='14' fill='%23e0e0e0'/%3E%3C/svg%3E";
									}
								}

								return (
									<img
										loading="eager"
										alt={BACKGROUND_SOURCES[item]}
										className="size-3.5 rounded"
										src={imageSrc}
									/>
								);
							};

							let iconContent: React.ReactNode = null;
							switch (item) {
								case "gradient":
									iconContent = getGradientBackground();
									break;
								case "color":
									iconContent = getColorBackground();
									break;
								case "image":
								case "wallpaper":
									iconContent = getImageBackground();
									break;
							}

							return (
								<KTabs.Trigger
									key={item}
									value={item}
									className="z-10 flex-1 py-2.5 px-2 text-xs text-gray-11 ui-selected:border-gray-3 ui-selected:bg-gray-3 ui-not-selected:hover:border-gray-7 rounded-[10px] transition-colors duration-200 outline-none border ui-selected:text-gray-12 peer"
								>
									<div className="flex gap-1.5 justify-center items-center">
										{iconContent}
										{BACKGROUND_SOURCES[item]}
									</div>
								</KTabs.Trigger>
							);
						})}
					</KTabs.List>
					<div className="my-5 w-full border-t border-dashed border-gray-5" />
					<KTabs.Content value="wallpaper">
						<KTabs className="overflow-hidden relative" value={backgroundTab}>
							<KTabs.List
								ref={backgroundRef}
								className="flex overflow-x-auto overscroll-contain relative z-10 flex-row gap-2 items-center mb-3 text-xs hide-scroll"
								style={{
									WebkitMaskImage: `linear-gradient(to right, transparent, black ${
										scrollX > 0 ? "24px" : "0"
									}, black calc(100% - ${reachedEndOfScroll ? "0px" : "24px"}), transparent)`,
									maskImage: `linear-gradient(to right, transparent, black ${
										scrollX > 0 ? "24px" : "0"
									}, black calc(100% - ${reachedEndOfScroll ? "0px" : "24px"}), transparent)`,
								} as React.CSSProperties}
							>
								{Object.entries(BACKGROUND_THEMES).map(([key, value]) => (
									<KTabs.Trigger
										key={key}
										onClick={() => setBackgroundTab(key as keyof typeof BACKGROUND_THEMES)}
										value={key}
										className="flex relative z-10 flex-1 justify-center items-center px-4 py-2 bg-transparent rounded-lg border transition-colors duration-200 text-gray-11 ui-not-selected:hover:border-gray-7 ui-selected:bg-gray-3 ui-selected:border-gray-3 group ui-selected:text-gray-12 disabled:opacity-50 focus:outline-none"
									>
										{value}
									</KTabs.Trigger>
								))}
							</KTabs.List>
						</KTabs>
						<KRadioGroup
							value={
								project.background.source.type === "wallpaper"
									? wallpapers.find((w) =>
											project.background.source.path?.includes(w.id),
										)?.url ?? undefined
									: undefined
							}
							onChange={(photoUrl) => {
								try {
									const wallpaper = wallpapers.find((w) => w.url === photoUrl);
									if (!wallpaper) return;

									debouncedSetProject(wallpaper.rawPath);
									ensurePaddingForBackground();
								} catch (err) {
									console.error("Failed to set wallpaper:", err);
								}
							}}
							className="grid grid-cols-7 gap-2 h-auto"
						>
							{wallpapersLoading ? (
								<div className="flex col-span-7 justify-center items-center h-32 text-gray-11">
									<div className="flex flex-col gap-2 items-center">
										<div className="w-6 h-6 rounded-full border-2 animate-spin border-gray-5 border-t-blue-400" />
										<span>Loading wallpapers...</span>
									</div>
								</div>
							) : (
								<>
									{filteredWallpapers.slice(0, 21).map((photo) => (
										<KRadioGroup.Item
											key={photo.id}
											value={photo.url}
											className="relative aspect-square group"
										>
											<KRadioGroup.ItemInput className="peer" />
											<KRadioGroup.ItemControl className="overflow-hidden w-full h-full rounded-lg transition cursor-pointer ui-not-checked:ring-offset-1 ui-not-checked:ring-offset-gray-200 ui-not-checked:hover:ring-1 ui-not-checked:hover:ring-gray-400 ui-checked:ring-2 ui-checked:ring-gray-500 ui-checked:ring-offset-2 ui-checked:ring-offset-gray-200">
												<img
													src={photo.url}
													loading="eager"
													className="object-cover w-full h-full"
													alt="Wallpaper option"
												/>
											</KRadioGroup.ItemControl>
										</KRadioGroup.Item>
									))}
									{filteredWallpapers.length > 21 && (
										<Collapsible className="col-span-7">
											<Collapsible.Content className="animate-in slide-in-from-top-2 fade-in">
												<div className="grid grid-cols-7 gap-2">
													{filteredWallpapers.map((photo) => (
														<KRadioGroup.Item
															key={photo.id}
															value={photo.url}
															className="relative aspect-square group"
														>
															<KRadioGroup.ItemInput className="peer" />
															<KRadioGroup.ItemControl className="overflow-hidden w-full h-full rounded-lg border cursor-pointer border-gray-5 ui-checked:border-blue-9 ui-checked:ring-2 ui-checked:ring-blue-9 peer-focus-visible:border-2 peer-focus-visible:border-blue-9">
																<img
																	src={photo.url}
																	alt="Wallpaper option"
																	className="object-cover w-full h-full"
																	loading="lazy"
																/>
															</KRadioGroup.ItemControl>
														</KRadioGroup.Item>
													))}
												</div>
											</Collapsible.Content>
										</Collapsible>
									)}
								</>
							)}
						</KRadioGroup>
					</KTabs.Content>
					<KTabs.Content value="image">
						{project.background.source.type === "image" &&
						project.background.source.path ? (
							<div className="overflow-hidden relative w-full h-48 rounded-md border border-gray-3 group">
								<img
									src={project.background.source.path}
									className="object-cover w-full h-full"
									alt="Selected background"
								/>
								<div className="absolute top-2 right-2">
									<button
										type="button"
										onClick={() =>
											setProject((prev) => ({
												...prev,
												background: {
													...prev.background,
													source: {
														type: "image",
														path: null,
													},
												},
											}))
										}
										className="p-2 text-white rounded-full transition-colors bg-black/50 hover:bg-black/70"
									>
										<XCircle className="w-4 h-4" />
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="p-6 bg-gray-2 text-[13px] w-full rounded-[0.5rem] border border-gray-5 border-dashed flex flex-col items-center justify-center gap-[0.5rem] hover:bg-gray-3 transition-colors duration-100"
							>
								<ImageIcon className="text-gray-11 size-6" />
								<span className="text-gray-12">
									Click to select or drag and drop image
								</span>
							</button>
						)}
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							accept="image/apng, image/avif, image/jpeg, image/png, image/webp"
							onChange={async (e) => {
								const file = e.currentTarget.files?.[0];
								if (!file) return;

								const validExtensions = [
									"jpg",
									"jpeg",
									"png",
									"gif",
									"webp",
									"bmp",
								];
								const extension = file.name.split(".").pop()?.toLowerCase();
								if (!extension || !validExtensions.includes(extension)) {
									console.error("Invalid image file type");
									return;
								}

								try {
									// For web, create a blob URL or upload to server
									const blobUrl = URL.createObjectURL(file);
									setProject((prev) => ({
										...prev,
										background: {
											...prev.background,
											source: {
												type: "image",
												path: blobUrl,
											},
										},
									}));
								} catch (err) {
									console.error("Failed to load image:", err);
								}
							}}
						/>
					</KTabs.Content>
					<KTabs.Content value="color">
						{project.background.source.type === "color" && (
							<div className="flex flex-col flex-wrap gap-3">
								<div className="flex flex-row items-center w-full h-10">
									<RgbInput
										value={
											project.background.source.type === "color"
												? project.background.source.value
												: [0, 0, 0]
										}
										onChange={(value) => {
											setProject((prev) => ({
												...prev,
												background: {
													...prev.background,
													source: {
														type: "color",
														value,
													},
												},
											}));
										}}
									/>
								</div>

								<div className="flex flex-wrap gap-2">
									{BACKGROUND_COLORS.map((color) => (
										<label key={color} className="relative">
											<input
												type="radio"
												className="sr-only peer"
												name="colorPicker"
												onChange={(e) => {
													if (!e.target.checked) return;

													const rgbValue = hexToRgb(color);
													if (!rgbValue) return;

													const [r, g, b, a] = rgbValue;
													const colorSource = {
														type: "color",
														value: [r, g, b] as [number, number, number],
														alpha: a,
													};

													setProject((prev) => ({
														...prev,
														background: {
															...prev.background,
															source: colorSource,
														},
													}));
												}}
											/>
											<div
												className="rounded-lg transition-all duration-200 cursor-pointer size-8 peer-checked:hover:opacity-100 peer-hover:opacity-70 peer-checked:ring-2 peer-checked:ring-gray-500 peer-checked:ring-offset-2 peer-checked:ring-offset-gray-200"
												style={{
													background:
														color === "#00000000"
															? CHECKERED_BUTTON_BACKGROUND
															: color,
												}}
											/>
										</label>
									))}
								</div>
							</div>
						)}
					</KTabs.Content>
					<KTabs.Content value="gradient" className="flex flex-row justify-between">
						{project.background.source.type === "gradient" && (
							<div className="flex flex-col gap-3">
								<div className="flex gap-5 h-10">
									<RgbInput
										value={project.background.source.from}
										onChange={(from) => {
											setProject((prev) => ({
												...prev,
												background: {
													...prev.background,
													source: {
														type: "gradient",
														from,
														to: prev.background.source.to,
														angle: prev.background.source.angle ?? 90,
													},
												},
											}));
										}}
									/>
									<RgbInput
										value={project.background.source.to}
										onChange={(to) => {
											setProject((prev) => ({
												...prev,
												background: {
													...prev.background,
													source: {
														type: "gradient",
														from: prev.background.source.from,
														to,
														angle: prev.background.source.angle ?? 90,
													},
												},
											}));
										}}
									/>
									<div
										className="flex relative flex-col items-center p-1 ml-auto rounded-full border bg-gray-1 border-gray-3 size-10 cursor-ns-resize shrink-0"
										style={{
											transform: `rotate(${project.background.source.angle ?? 90}deg)`,
										}}
										onMouseDown={(downEvent) => {
											const start = project.background.source.angle ?? 90;
											const resumeHistory = projectHistory.pause();
											const max = 360;

											const handleMouseMove = (moveEvent: MouseEvent) => {
												const rawNewAngle =
													Math.round(start + (downEvent.clientY - moveEvent.clientY)) %
													max;
												const newAngle = moveEvent.shiftKey
													? rawNewAngle
													: Math.round(rawNewAngle / 45) * 45;

												setProject((prev) => ({
													...prev,
													background: {
														...prev.background,
														source: {
															...prev.background.source,
															angle:
																newAngle < 0 ? newAngle + max : newAngle,
														},
													},
												}));
											};

											const handleMouseUp = () => {
												window.removeEventListener("mousemove", handleMouseMove);
												window.removeEventListener("mouseup", handleMouseUp);
												resumeHistory();
											};

											window.addEventListener("mousemove", handleMouseMove);
											window.addEventListener("mouseup", handleMouseUp);
										}}
									>
										<div className="bg-blue-9 rounded-full size-1.5" />
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									{BACKGROUND_GRADIENTS.map((gradient, idx) => {
										const angle = project.background.source.angle ?? 90;
										return (
											<label key={idx} className="relative">
												<input
													type="radio"
													className="sr-only peer"
													name="colorPicker"
													onChange={(e) => {
														if (e.target.checked) {
															setProject((prev) => ({
																...prev,
																background: {
																	...prev.background,
																	source: {
																		type: "gradient",
																		from: gradient.from,
																		to: gradient.to,
																		angle: prev.background.source.angle ?? 90,
																	},
																},
															}));
														}
													}}
												/>
												<div
													className="rounded-lg transition-all duration-200 cursor-pointer size-8 peer-checked:hover:opacity-100 peer-hover:opacity-70 peer-checked:ring-2 peer-checked:ring-gray-500 peer-checked:ring-offset-2 peer-checked:ring-offset-gray-200"
													style={{
														background: `linear-gradient(${angle}deg, rgb(${gradient.from.join(", ")}), rgb(${gradient.to.join(", ")}))`,
													}}
												/>
											</label>
										);
									})}
								</div>
							</div>
						)}
					</KTabs.Content>
				</KTabs>
			</Field>

			<Field name="Background Blur" icon={<BlurIcon className="size-4" />}>
				<Slider
					value={[project.background.blur]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							background: { ...prev.background, blur: v[0] },
						}))
					}
					minValue={0}
					maxValue={100}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<div className="w-full border-t border-gray-300 border-dashed" />
			<Field name="Padding" icon={<Square className="size-4" />}>
				<Slider
					value={[project.background.padding]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							background: { ...prev.background, padding: v[0] },
						}))
					}
					minValue={0}
					maxValue={40}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<Field name="Rounded Corners" icon={<CornerUpLeft className="size-4" />}>
				<Slider
					value={[project.background.rounding]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							background: { ...prev.background, rounding: v[0] },
						}))
					}
					minValue={0}
					maxValue={100}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<Field
				name="Border"
				icon={<Settings className="size-4" />}
				value={
					<Toggle
						checked={project.background.border?.enabled ?? false}
						onChange={(enabled) => {
							const prev = project.background.border ?? {
								enabled: false,
								width: 5.0,
								color: [0, 0, 0],
								opacity: 50.0,
							};

							if (scrollRef && enabled) {
								setTimeout(
									() =>
										scrollRef.scrollTo({
											top: scrollRef.scrollHeight,
											behavior: "smooth",
										}),
									100,
								);
							}

							setProject((prev) => ({
								...prev,
								background: {
									...prev.background,
									border: {
										...prev,
										enabled,
									},
								},
							}));
						}}
					/>
				}
			/>
			<KCollapsible open={project.background.border?.enabled ?? false}>
				<KCollapsible.Content className="overflow-hidden opacity-0 transition-opacity animate-collapsible-up ui-expanded:animate-collapsible-down ui-expanded:opacity-100">
					<div className="flex flex-col gap-6 pb-6">
						<Field name="Border Width" icon={<Maximize2 className="size-4" />}>
							<Slider
								value={[project.background.border?.width ?? 5.0]}
								onChange={(v) =>
									setProject((prev) => ({
										...prev,
										background: {
											...prev.background,
											border: {
												...(prev.background.border ?? {
													enabled: true,
													width: 5.0,
													color: [0, 0, 0],
													opacity: 50.0,
												}),
												width: v[0],
											},
										},
									}))
								}
								minValue={1}
								maxValue={20}
								step={0.1}
								formatTooltip="px"
							/>
						</Field>
						<Field name="Border Color" icon={<ImageIcon className="size-4" />}>
							<RgbInput
								value={project.background.border?.color ?? [0, 0, 0]}
								onChange={(color) =>
									setProject((prev) => ({
										...prev,
										background: {
											...prev.background,
											border: {
												...(prev.background.border ?? {
													enabled: true,
													width: 5.0,
													color: [0, 0, 0],
													opacity: 50.0,
												}),
												color,
											},
										},
									}))
								}
							/>
						</Field>
						<Field
							name="Border Opacity"
							icon={<ShadowIcon className="size-4" />}
						>
							<Slider
								value={[project.background.border?.opacity ?? 50.0]}
								onChange={(v) =>
									setProject((prev) => ({
										...prev,
										background: {
											...prev.background,
											border: {
												...(prev.background.border ?? {
													enabled: true,
													width: 5.0,
													color: [0, 0, 0],
													opacity: 50.0,
												}),
												opacity: v[0],
											},
										},
									}))
								}
								minValue={0}
								maxValue={100}
								step={0.1}
								formatTooltip="%"
							/>
						</Field>
					</div>
				</KCollapsible.Content>
			</KCollapsible>
			<Field name="Shadow" icon={<ShadowIcon className="size-4" />}>
				<Slider
					value={[project.background.shadow ?? 0]}
					onChange={(v) => {
						setProject((prev) => ({
							...prev,
							background: {
								...prev.background,
								shadow: v[0],
								advancedShadow:
									v[0] > 0 && !prev.background.advancedShadow
										? {
												size: 50,
												opacity: 18,
												blur: 50,
											}
										: prev.background.advancedShadow,
							},
						}));
					}}
					minValue={0}
					maxValue={100}
					step={0.1}
					formatTooltip="%"
				/>

				<ShadowSettings
					scrollRef={scrollRef}
					size={{
						value: [project.background.advancedShadow?.size ?? 50],
						onChange: (v) => {
							setProject((prev) => ({
								...prev,
								background: {
									...prev.background,
									advancedShadow: {
										...(prev.background.advancedShadow ?? {
											size: 50,
											opacity: 18,
											blur: 50,
										}),
										size: v[0],
									},
								},
							}));
						},
					}}
					opacity={{
						value: [project.background.advancedShadow?.opacity ?? 18],
						onChange: (v) => {
							setProject((prev) => ({
								...prev,
								background: {
									...prev.background,
									advancedShadow: {
										...(prev.background.advancedShadow ?? {
											size: 50,
											opacity: 18,
											blur: 50,
										}),
										opacity: v[0],
									},
								},
							}));
						},
					}}
					blur={{
						value: [project.background.advancedShadow?.blur ?? 50],
						onChange: (v) => {
							setProject((prev) => ({
								...prev,
								background: {
									...prev.background,
									advancedShadow: {
										...(prev.background.advancedShadow ?? {
											size: 50,
											opacity: 18,
											blur: 50,
										}),
										blur: v[0],
									},
								},
							}));
						},
					}}
				/>
			</Field>
		</KTabs.Content>
	);
}

// CameraConfig component - Step 3: Converting to React
function CameraConfig({ scrollRef }: { scrollRef: HTMLDivElement | null }) {
	const { project, setProject } = useEditorContext();

	const cameraPositions = [
		{ x: "left", y: "top" } as const,
		{ x: "center", y: "top" } as const,
		{ x: "right", y: "top" } as const,
		{ x: "left", y: "bottom" } as const,
		{ x: "center", y: "bottom" } as const,
		{ x: "right", y: "bottom" } as const,
	];

	return (
		<KTabs.Content value={TAB_IDS.camera} className="flex flex-col gap-6 p-4">
			<Field icon={<Camera className="size-4" />} name="Camera">
				<div className="flex flex-col gap-6">
					<div>
						<Subfield name="Position" />
						<KRadioGroup
							value={`${project.camera.position.x}:${project.camera.position.y}`}
							onValueChange={(v) => {
								const [x, y] = v.split(":");
								setProject((prev) => ({
									...prev,
									camera: {
										...prev.camera,
										position: { x, y } as any,
									},
								}));
							}}
							className="mt-[0.75rem] rounded-[0.5rem] border border-gray-3 bg-gray-2 w-full h-[7.5rem] relative"
						>
							{cameraPositions.map((item) => (
								<KRadioGroup.Item key={`${item.x}:${item.y}`} value={`${item.x}:${item.y}`}>
									<KRadioGroup.ItemInput className="peer" />
									<KRadioGroup.ItemControl
										className={cx(
											"cursor-pointer size-6 shrink-0 rounded-[0.375rem] bg-gray-5 absolute flex justify-center items-center ui-checked:bg-blue-9 focus-visible:outline peer-focus-visible:outline outline-2 outline-blue-9 outline-offset-2 transition-colors duration-100",
											item.x === "left"
												? "left-2"
												: item.x === "right"
													? "right-2"
													: "left-1/2 transform -translate-x-1/2",
											item.y === "top" ? "top-2" : "bottom-2",
										)}
										onClick={() =>
											setProject((prev) => ({
												...prev,
												camera: {
													...prev.camera,
													position: item,
												},
											}))
										}
									>
										<div className="size-[0.5rem] shrink-0 bg-white rounded-full" />
									</KRadioGroup.ItemControl>
								</KRadioGroup.Item>
							))}
						</KRadioGroup>
					</div>
					<Subfield name="Hide Camera">
						<Toggle
							checked={project.camera.hide}
							onChange={(hide) =>
								setProject((prev) => ({
									...prev,
									camera: { ...prev.camera, hide },
								}))
							}
						/>
					</Subfield>
					<Subfield name="Mirror Camera">
						<Toggle
							checked={project.camera.mirror}
							onChange={(mirror) =>
								setProject((prev) => ({
									...prev,
									camera: { ...prev.camera, mirror },
								}))
							}
						/>
					</Subfield>
					<Subfield name="Shape">
						<KSelect<{ name: string; value: CameraShape }>
							options={CAMERA_SHAPES}
							optionValue="value"
							optionTextValue="name"
							value={CAMERA_SHAPES.find((v) => v.value === project.camera.shape)}
							onChange={(v) => {
								if (v)
									setProject((prev) => ({
										...prev,
										camera: { ...prev.camera, shape: v.value },
									}));
							}}
							disallowEmptySelection
							itemComponent={(props) => (
								<MenuItem as={KSelect.Item} item={props.item}>
									<KSelect.ItemLabel className="flex-1">
										{props.item.rawValue.name}
									</KSelect.ItemLabel>
								</MenuItem>
							)}
						>
							<KSelect.Trigger className="flex flex-row gap-2 items-center px-2 w-full h-8 rounded-lg transition-colors bg-gray-3 disabled:text-gray-11">
								<KSelect.Value<{
									name: string;
									value: CameraShape;
								}> className="flex-1 text-sm text-left truncate text-[--gray-500] font-normal">
									{(state) => <span>{state.selectedOption().name}</span>}
								</KSelect.Value>
								<KSelect.Icon
									as={(props: any) => (
										<ChevronDown
											{...props}
											className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180 text-[--gray-500]"
										/>
									)}
								/>
							</KSelect.Trigger>
							<KSelect.Portal>
								<PopperContent
									as={KSelect.Content}
									className={cx(topSlideAnimateClasses, "z-50")}
								>
									<MenuItemList
										className="overflow-y-auto max-h-32"
										as={KSelect.Listbox}
									/>
								</PopperContent>
							</KSelect.Portal>
						</KSelect>
					</Subfield>
				</div>
			</Field>
			<div className="w-full border-t border-dashed border-gray-5" />
			<Field name="Size" icon={<Maximize2 className="size-4" />}>
				<Slider
					value={[project.camera.size]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							camera: { ...prev.camera, size: v[0] },
						}))
					}
					minValue={20}
					maxValue={80}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<Field name="Size During Zoom" icon={<Maximize2 className="size-4" />}>
				<Slider
					value={[project.camera.zoom_size ?? 60]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							camera: { ...prev.camera, zoom_size: v[0] },
						}))
					}
					minValue={10}
					maxValue={60}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<Field name="Rounded Corners" icon={<CornerUpLeft className="size-4" />}>
				<Slider
					value={[project.camera.rounding ?? 0]}
					onChange={(v) =>
						setProject((prev) => ({
							...prev,
							camera: { ...prev.camera, rounding: v[0] },
						}))
					}
					minValue={0}
					maxValue={100}
					step={0.1}
					formatTooltip="%"
				/>
			</Field>
			<Field name="Shadow" icon={<ShadowIcon className="size-4" />}>
				<div className="space-y-8">
					<Slider
						value={[project.camera.shadow ?? 0]}
						onChange={(v) =>
							setProject((prev) => ({
								...prev,
								camera: { ...prev.camera, shadow: v[0] },
							}))
						}
						minValue={0}
						maxValue={100}
						step={0.1}
						formatTooltip="%"
					/>
					<ShadowSettings
						scrollRef={scrollRef}
						size={{
							value: [project.camera.advanced_shadow?.size ?? 50],
							onChange: (v) => {
								setProject((prev) => ({
									...prev,
									camera: {
										...prev.camera,
										advanced_shadow: {
											...(prev.camera.advanced_shadow ?? {
												size: 50,
												opacity: 18,
												blur: 50,
											}),
											size: v[0],
										},
									},
								}));
							},
						}}
						opacity={{
							value: [project.camera.advanced_shadow?.opacity ?? 18],
							onChange: (v) => {
								setProject((prev) => ({
									...prev,
									camera: {
										...prev.camera,
										advanced_shadow: {
											...(prev.camera.advanced_shadow ?? {
												size: 50,
												opacity: 18,
												blur: 50,
											}),
											opacity: v[0],
										},
									},
								}));
							},
						}}
						blur={{
							value: [project.camera.advanced_shadow?.blur ?? 50],
							onChange: (v) => {
								setProject((prev) => ({
									...prev,
									camera: {
										...prev.camera,
										advanced_shadow: {
											...(prev.camera.advanced_shadow ?? {
												size: 50,
												opacity: 18,
												blur: 50,
											}),
											blur: v[0],
										},
									},
								}));
							},
						}}
					/>
				</div>
			</Field>
		</KTabs.Content>
	);
}
