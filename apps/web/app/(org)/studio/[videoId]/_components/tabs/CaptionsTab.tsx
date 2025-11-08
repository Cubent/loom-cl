"use client";

import { Select as KSelect } from "~/components/kobalte-compat";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Toggle } from "~/components/Toggle";
import type { CaptionSegment, CaptionSettings } from "../types";
import { FPS, OUTPUT_SIZE, useEditorContext } from "../context/EditorContext";
import { TextInput } from "../TextInput";
import {
	Field,
	Input,
	MenuItem,
	MenuItemList,
	PopperContent,
	Slider,
	Subfield,
	topLeftAnimateClasses,
} from "../ui";
import { MessageSquare, ChevronDown } from "lucide-react";

// Model information
interface ModelOption {
	name: string;
	label: string;
}

interface LanguageOption {
	code: string;
	label: string;
}

interface FontOption {
	value: string;
	label: string;
}

const MODEL_OPTIONS: ModelOption[] = [
	{ name: "tiny", label: "Tiny (75MB) - Fastest, less accurate" },
	{ name: "base", label: "Base (142MB) - Fast, decent accuracy" },
	{ name: "small", label: "Small (466MB) - Balanced speed/accuracy" },
	{ name: "medium", label: "Medium (1.5GB) - Slower, more accurate" },
	{ name: "large-v3", label: "Large (3GB) - Slowest, most accurate" },
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
	{ code: "auto", label: "Auto Detect" },
	{ code: "en", label: "English" },
	{ code: "es", label: "Spanish" },
	{ code: "fr", label: "French" },
	{ code: "de", label: "German" },
	{ code: "it", label: "Italian" },
	{ code: "pt", label: "Portuguese" },
	{ code: "nl", label: "Dutch" },
	{ code: "pl", label: "Polish" },
	{ code: "ru", label: "Russian" },
	{ code: "tr", label: "Turkish" },
	{ code: "ja", label: "Japanese" },
	{ code: "ko", label: "Korean" },
	{ code: "zh", label: "Chinese" },
];

const DEFAULT_MODEL = "tiny";
const MODEL_FOLDER = "transcription_models";

const fontOptions = [
	{ value: "System Sans-Serif", label: "System Sans-Serif" },
	{ value: "System Serif", label: "System Serif" },
	{ value: "System Monospace", label: "System Monospace" },
];

// Helper functions for color conversion
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? [
				parseInt(result[1], 16),
				parseInt(result[2], 16),
				parseInt(result[3], 16),
			]
		: [0, 0, 0];
}

function rgbToHex(rgb: RGB): string {
	return `#${rgb.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// RgbInput component
function RgbInput({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [text, setText] = useState(value);
	const prevColorRef = useRef(value);
	const colorInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setText(value);
		prevColorRef.current = value;
	}, [value]);

	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setText(newValue);
		onChange(newValue);
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newText = e.target.value;
		setText(newText);
		onChange(newText);
	};

	const handleFocus = () => {
		prevColorRef.current = value;
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		if (!/^#[0-9A-F]{6}$/i.test(e.target.value)) {
			setText(prevColorRef.current);
			onChange(prevColorRef.current);
		}
	};

	return (
		<div className="flex flex-row items-center gap-[0.75rem] relative">
			<button
				type="button"
				className="size-[3rem] rounded-[0.5rem]"
				style={{
					backgroundColor: text,
				}}
				onClick={() => colorInputRef.current?.click()}
			/>
			<input
				ref={colorInputRef}
				type="color"
				className="absolute left-0 bottom-0 w-[3rem] opacity-0"
				value={text}
				onChange={handleColorChange}
			/>
			<TextInput
				className="w-[5rem] p-[0.375rem] border text-gray-400 rounded-[0.5rem] bg-gray-50"
				value={text}
				onFocus={handleFocus}
				onChange={handleTextChange}
				onBlur={handleBlur}
			/>
		</div>
	);
}

// Button component for web
function Button({
	className,
	onClick,
	disabled,
	children,
	variant,
	size,
}: {
	className?: string;
	onClick?: () => void;
	disabled?: boolean;
	children: React.ReactNode;
	variant?: "destructive" | "default";
	size?: "sm" | "default";
}) {
	return (
		<button
			className={`px-3 py-1.5 rounded-md transition-colors ${
				variant === "destructive"
					? "bg-red-500 hover:bg-red-600 text-white"
					: "bg-blue-500 hover:bg-blue-600 text-white"
			} ${size === "sm" ? "text-sm px-2 py-1" : ""} ${className || ""}`}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
}

// IconDelete component
function IconDelete() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="size-4"
		>
			<path
				d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
				fill="currentColor"
			/>
		</svg>
	);
}

// CaptionsTab component
export function CaptionsTab() {
	const { project, setProject, videoData, editorState } = useEditorContext();

	// Scroll management
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [scrollState, setScrollState] = useState({
		lastScrollTop: 0,
		isScrolling: false,
	});

	// Create local state for caption settings
	const [captionSettings, setCaptionSettings] = useState<CaptionSettings>(
		project?.captions?.settings || {
			enabled: false,
			font: "Arial",
			size: 24,
			color: "#FFFFFF",
			backgroundColor: "#000000",
			backgroundOpacity: 80,
			position: "bottom",
			bold: true,
			italic: false,
			outline: true,
			outlineColor: "#000000",
			exportWithSubtitles: false,
		},
	);

	// Sync caption settings with project
	useEffect(() => {
		if (!project?.captions) return;

		const settings = captionSettings;

		// Only update if there are actual changes
		if (
			JSON.stringify(settings) !== JSON.stringify(project.captions.settings)
		) {
			setProject((prev) => ({
				...prev,
				captions: {
					...prev.captions!,
					settings,
				},
			}));
		}
	}, [captionSettings, project?.captions?.settings, setProject]);

	// Sync project settings to local state
	useEffect(() => {
		if (project?.captions?.settings) {
			setCaptionSettings(project.captions.settings);
		}
	}, [project?.captions?.settings]);

	// Helper function to update caption settings
	const updateCaptionSetting = useCallback(
		(key: keyof CaptionSettings, value: any) => {
			if (!project?.captions) return;

			// Store scroll position before update
			if (scrollContainerRef.current) {
				setScrollState((prev) => ({
					...prev,
					lastScrollTop: scrollContainerRef.current!.scrollTop,
				}));
			}

			// Update local state
			setCaptionSettings((prev) => ({
				...prev,
				[key]: value,
			}));
		},
		[project?.captions],
	);

	// Restore scroll position after any content changes
	useEffect(() => {
		if (scrollContainerRef.current && scrollState.lastScrollTop > 0) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current) {
					scrollContainerRef.current.scrollTop = scrollState.lastScrollTop;
				}
			});
		}
	}, [scrollState.lastScrollTop]);

	// Model selection state
	const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
	const [selectedLanguage, setSelectedLanguage] = useState("auto");
	const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

	// States for captions
	const [modelExists, setModelExists] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [hasAudio, setHasAudio] = useState(false);
	const [currentCaption, setCurrentCaption] = useState<string | null>(null);

	// Ensure captions object is initialized in project config
	useEffect(() => {
		if (!project) return;

		if (!project.captions) {
			// Initialize captions with default settings
			setProject((prev) => ({
				...prev,
				captions: {
					segments: [],
					settings: {
						enabled: false,
						font: "Arial",
						size: 24,
						color: "#FFFFFF",
						backgroundColor: "#000000",
						backgroundOpacity: 80,
						position: "bottom",
						bold: true,
						italic: false,
						outline: true,
						outlineColor: "#000000",
						exportWithSubtitles: false,
					},
				},
			}));
		}
	}, [project, setProject]);

	// Check downloaded models on mount
	useEffect(() => {
		const checkModels = async () => {
			try {
				// For web, check localStorage for downloaded models
				const storedModels = localStorage.getItem("downloadedModels");
				if (storedModels) {
					const models = JSON.parse(storedModels) as string[];
					setDownloadedModels(models);
					setModelExists(models.includes(selectedModel));
				}

				// Check if the video has audio (for web, assume it does if videoData exists)
				if (videoData) {
					setHasAudio(true);
				}

				// Restore download state if there was an ongoing download
				const downloadState = localStorage.getItem("modelDownloadState");
				if (downloadState) {
					const { model, progress } = JSON.parse(downloadState);
					if (model && progress < 100) {
						setDownloadingModel(model);
						setDownloadProgress(progress);
						setIsDownloading(true);
					} else {
						localStorage.removeItem("modelDownloadState");
					}
				}
			} catch (error) {
				console.error("Error checking models:", error);
			}
		};
		checkModels();
	}, [selectedModel, videoData]);

	// Save download state when it changes
	useEffect(() => {
		if (isDownloading && downloadingModel) {
			localStorage.setItem(
				"modelDownloadState",
				JSON.stringify({
					model: downloadingModel,
					progress: downloadProgress,
				}),
			);
		} else {
			localStorage.removeItem("modelDownloadState");
		}
	}, [isDownloading, downloadingModel, downloadProgress]);

	// Effect to update current caption based on playback time
	useEffect(() => {
		if (!project?.captions?.segments || editorState.playbackTime === undefined)
			return;

		const time = editorState.playbackTime;
		const segments = project.captions.segments;

		// Binary search for the correct segment
		const findSegment = (
			time: number,
			segments: CaptionSegment[],
		): CaptionSegment | undefined => {
			let left = 0;
			let right = segments.length - 1;

			while (left <= right) {
				const mid = Math.floor((left + right) / 2);
				const segment = segments[mid];

				if (time >= segment.start && time < segment.end) {
					return segment;
				}

				if (time < segment.start) {
					right = mid - 1;
				} else {
					left = mid + 1;
				}
			}

			return undefined;
		};

		// Find the current segment using binary search
		const currentSegment = findSegment(time, segments);

		// Only update if the caption has changed
		if (currentSegment?.text !== currentCaption) {
			setCurrentCaption(currentSegment?.text || null);
		}
	}, [project?.captions?.segments, editorState.playbackTime, currentCaption]);

	const checkModelExists = useCallback(async (modelName: string) => {
		// For web, check localStorage
		const storedModels = localStorage.getItem("downloadedModels");
		if (storedModels) {
			const models = JSON.parse(storedModels) as string[];
			return models.includes(modelName);
		}
		return false;
	}, []);

	const downloadModel = useCallback(async () => {
		try {
			const modelToDownload = selectedModel;
			setIsDownloading(true);
			setDownloadProgress(0);
			setDownloadingModel(modelToDownload);

			// For web, simulate download progress
			// In a real implementation, this would call an API endpoint
			const simulateDownload = () => {
				let progress = 0;
				const interval = setInterval(() => {
					progress += 10;
					setDownloadProgress(progress);
					if (progress >= 100) {
						clearInterval(interval);
						setDownloadedModels((prev) => {
							const updated = [...prev, modelToDownload];
							localStorage.setItem("downloadedModels", JSON.stringify(updated));
							return updated;
						});
						setModelExists(true);
						setIsDownloading(false);
						setDownloadingModel(null);
						console.log("Transcription model downloaded successfully!");
					}
				}, 200);
			};

			simulateDownload();
		} catch (error) {
			console.error("Error downloading model:", error);
			setIsDownloading(false);
			setDownloadingModel(null);
		}
	}, [selectedModel]);

	const generateCaptions = useCallback(async () => {
		if (!videoData) {
			console.error("Video data not found");
			return;
		}

		setIsGenerating(true);

		try {
			// For web, call API endpoint to generate captions
			const response = await fetch(`/api/video/${videoData.id}/transcribe`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: selectedModel,
					language: selectedLanguage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to generate captions");
			}

			const result = await response.json();

			if (result && result.segments && result.segments.length > 0) {
				// Update project with the new segments
				setProject((prev) => ({
					...prev,
					captions: {
						...prev.captions!,
						segments: result.segments,
					},
				}));
				updateCaptionSetting("enabled", true);
				console.log("Captions generated successfully!");
			} else {
				console.error(
					"No captions were generated. The audio might be too quiet or unclear.",
				);
			}
		} catch (error) {
			console.error("Error generating captions:", error);
		} finally {
			setIsGenerating(false);
		}
	}, [videoData, selectedModel, selectedLanguage, setProject, updateCaptionSetting]);

	// Segment operations that update project directly
	const deleteSegment = useCallback(
		(id: string) => {
			if (!project?.captions?.segments) return;

			setProject((prev) => ({
				...prev,
				captions: {
					...prev.captions!,
					segments: prev.captions!.segments.filter((segment) => segment.id !== id),
				},
			}));
		},
		[project?.captions?.segments, setProject],
	);

	const updateSegment = useCallback(
		(
			id: string,
			updates: Partial<{ start: number; end: number; text: string }>,
		) => {
			if (!project?.captions?.segments) return;

			setProject((prev) => ({
				...prev,
				captions: {
					...prev.captions!,
					segments: prev.captions!.segments.map((segment) =>
						segment.id === id ? { ...segment, ...updates } : segment,
					),
				},
			}));
		},
		[project?.captions?.segments, setProject],
	);

	const addSegment = useCallback(
		(time: number) => {
			if (!project?.captions) return;

			const id = `segment-${Date.now()}`;
			setProject((prev) => ({
				...prev,
				captions: {
					...prev.captions!,
					segments: [
						...prev.captions!.segments,
						{
							id,
							start: time,
							end: time + 2,
							text: "New caption",
						},
					],
				},
			}));
		},
		[project?.captions, setProject],
	);

	const handleScroll = useCallback(() => {
		if (!scrollState.isScrolling && scrollContainerRef.current) {
			setScrollState((prev) => ({
				...prev,
				isScrolling: true,
				lastScrollTop: scrollContainerRef.current!.scrollTop,
			}));

			// Reset scrolling flag after scroll ends
			setTimeout(() => {
				setScrollState((prev) => ({
					...prev,
					isScrolling: false,
				}));
			}, 150);
		}
	}, [scrollState.isScrolling]);

	return (
		<div className="flex flex-col h-full">
			<div
				className="p-[0.75rem] text-[0.875rem] h-full transition-[height] duration-200"
				ref={scrollContainerRef}
				onScroll={handleScroll}
			>
				<Field name="Captions" icon={<MessageSquare className="size-4" />}>
					<div className="flex flex-col gap-4">
						<Subfield name="Enable Captions">
							<Toggle
								checked={captionSettings.enabled}
								onChange={(checked) => updateCaptionSetting("enabled", checked)}
							/>
						</Subfield>

						{captionSettings.enabled && (
							<div className="space-y-6 transition-all duration-200">
								{/* Model Selection and Download Section */}
								<div className="space-y-4">
									<div className="space-y-2">
										<label className="text-xs text-gray-500">Current Model</label>
										<KSelect<string>
											options={MODEL_OPTIONS.filter((m) =>
												downloadedModels.includes(m.name),
											).map((m) => m.name)}
											value={selectedModel}
											onChange={(value: string | null) => {
												if (value) {
													setSelectedModel(value);
													setModelExists(downloadedModels.includes(value));
												}
											}}
											itemComponent={(props) => (
												<MenuItem as={KSelect.Item} item={props.item}>
													<KSelect.ItemLabel className="flex-1">
														{
															MODEL_OPTIONS.find(
																(m) => m.name === props.item.rawValue,
															)?.label
														}
													</KSelect.ItemLabel>
												</MenuItem>
											)}
										>
											<KSelect.Trigger className="flex flex-row items-center h-9 px-3 gap-2 border rounded-lg border-gray-200 w-full text-gray-700 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
												<KSelect.Value<string> className="flex-1 text-left truncate">
													{(state) => {
														const model = MODEL_OPTIONS.find(
															(m) => m.name === state.selectedOption(),
														);
														return (
															<span>{model?.label || "Select a model"}</span>
														);
													}}
												</KSelect.Value>
												<KSelect.Icon>
													<ChevronDown className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180" />
												</KSelect.Icon>
											</KSelect.Trigger>
											<KSelect.Portal>
												<PopperContent
													as={KSelect.Content}
													className={topLeftAnimateClasses}
												>
													<MenuItemList
														className="max-h-48 overflow-y-auto"
														as={KSelect.Listbox}
													/>
												</PopperContent>
											</KSelect.Portal>
										</KSelect>
									</div>

									<div className="space-y-2">
										<label className="text-xs text-gray-500">
											Download New Model
										</label>
										<KSelect<string>
											options={MODEL_OPTIONS.map((m) => m.name)}
											value={selectedModel}
											onChange={(value: string | null) => {
												if (value) setSelectedModel(value);
											}}
											disabled={isDownloading}
											itemComponent={(props) => (
												<MenuItem as={KSelect.Item} item={props.item}>
													<KSelect.ItemLabel className="flex-1">
														{
															MODEL_OPTIONS.find(
																(m) => m.name === props.item.rawValue,
															)?.label
														}
														{downloadedModels.includes(props.item.rawValue)
															? " (Downloaded)"
															: ""}
													</KSelect.ItemLabel>
												</MenuItem>
											)}
										>
											<KSelect.Trigger className="flex flex-row items-center h-9 px-3 gap-2 border rounded-lg border-gray-200 w-full text-gray-700 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
												<KSelect.Value<string> className="flex-1 text-left truncate">
													{(state) => {
														const model = MODEL_OPTIONS.find(
															(m) => m.name === state.selectedOption(),
														);
														return (
															<span>{model?.label || "Select a model"}</span>
														);
													}}
												</KSelect.Value>
												<KSelect.Icon>
													<ChevronDown className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180" />
												</KSelect.Icon>
											</KSelect.Trigger>
											<KSelect.Portal>
												<PopperContent
													as={KSelect.Content}
													className={topLeftAnimateClasses}
												>
													<MenuItemList
														className="max-h-48 overflow-y-auto"
														as={KSelect.Listbox}
													/>
												</PopperContent>
											</KSelect.Portal>
										</KSelect>
									</div>

									{isDownloading ? (
										<div className="space-y-2">
											<div className="w-full bg-gray-100 rounded-full h-2">
												<div
													className="bg-blue-500 h-2 rounded-full transition-all duration-300"
													style={{ width: `${downloadProgress}%` }}
												/>
											</div>
											<p className="text-xs text-center text-gray-500">
												Downloading{" "}
												{
													MODEL_OPTIONS.find(
														(m) => m.name === downloadingModel,
													)?.label
												}
												: {Math.round(downloadProgress)}%
											</p>
										</div>
									) : (
										<Button
											className="w-full"
											onClick={downloadModel}
											disabled={
												isDownloading ||
												downloadedModels.includes(selectedModel)
											}
										>
											Download{" "}
											{MODEL_OPTIONS.find((m) => m.name === selectedModel)?.label}
										</Button>
									)}
								</div>

								{/* Language Selection */}
								<Subfield name="Language">
									<KSelect<string>
										options={LANGUAGE_OPTIONS.map((l) => l.code)}
										value={selectedLanguage}
										onChange={(value: string | null) => {
											if (value) setSelectedLanguage(value);
										}}
										itemComponent={(props) => (
											<MenuItem as={KSelect.Item} item={props.item}>
												<KSelect.ItemLabel className="flex-1">
													{
														LANGUAGE_OPTIONS.find(
															(l) => l.code === props.item.rawValue,
														)?.label
													}
												</KSelect.ItemLabel>
											</MenuItem>
										)}
									>
										<KSelect.Trigger className="flex flex-row items-center h-9 px-3 gap-2 border rounded-lg border-gray-200 w-full text-gray-700 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
											<KSelect.Value<string> className="flex-1 text-left truncate">
												{(state) => {
													const language = LANGUAGE_OPTIONS.find(
														(l) => l.code === state.selectedOption(),
													);
													return (
														<span>
															{language?.label || "Select a language"}
														</span>
													);
												}}
											</KSelect.Value>
											<KSelect.Icon>
												<ChevronDown className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180" />
											</KSelect.Icon>
										</KSelect.Trigger>
										<KSelect.Portal>
											<PopperContent
												as={KSelect.Content}
												className={topLeftAnimateClasses}
											>
												<MenuItemList
													className="max-h-48 overflow-y-auto"
													as={KSelect.Listbox}
												/>
											</PopperContent>
										</KSelect.Portal>
									</KSelect>
								</Subfield>

								{/* Generate Captions Button */}
								{hasAudio && (
									<Button
										onClick={generateCaptions}
										disabled={isGenerating}
										className="w-full"
									>
										{isGenerating ? "Generating..." : "Generate Captions"}
									</Button>
								)}

								{/* Font Settings */}
								<Field name="Font Settings" icon={<MessageSquare className="size-4" />}>
									<div className="space-y-3">
										<div className="flex flex-col gap-2">
											<span className="text-gray-500 text-sm">Font Family</span>
											<KSelect<string>
												options={fontOptions.map((f) => f.value)}
												value={captionSettings.font}
												onChange={(value) => {
													if (value === null) return;
													updateCaptionSetting("font", value);
												}}
												itemComponent={(props) => (
													<MenuItem as={KSelect.Item} item={props.item}>
														<KSelect.ItemLabel className="flex-1">
															{
																fontOptions.find(
																	(f) => f.value === props.item.rawValue,
																)?.label
															}
														</KSelect.ItemLabel>
													</MenuItem>
												)}
											>
												<KSelect.Trigger className="w-full flex items-center justify-between rounded-lg shadow px-3 py-2 bg-white border border-gray-300">
													<KSelect.Value<string>>
														{(state) =>
															fontOptions.find(
																(f) => f.value === state.selectedOption(),
															)?.label
														}
													</KSelect.Value>
													<KSelect.Icon>
														<ChevronDown className="size-4" />
													</KSelect.Icon>
												</KSelect.Trigger>
												<KSelect.Portal>
													<PopperContent
														as={KSelect.Content}
														className={topLeftAnimateClasses}
													>
														<MenuItemList
															className="max-h-48 overflow-y-auto"
															as={KSelect.Listbox}
														/>
													</PopperContent>
												</KSelect.Portal>
											</KSelect>
										</div>

										<div className="flex flex-col gap-2">
											<span className="text-gray-500 text-sm">Size</span>
											<Slider
												value={[captionSettings.size || 24]}
												onChange={(v) => updateCaptionSetting("size", v[0])}
												minValue={12}
												maxValue={48}
												step={1}
											/>
										</div>

										<div className="flex flex-col gap-2">
											<span className="text-gray-500 text-sm">Font Color</span>
											<RgbInput
												value={captionSettings.color || "#FFFFFF"}
												onChange={(value) =>
													updateCaptionSetting("color", value)
												}
											/>
										</div>
									</div>
								</Field>

								{/* Background Settings */}
								<Field
									name="Background Settings"
									icon={<MessageSquare className="size-4" />}
								>
									<div className="space-y-3">
										<div className="flex flex-col gap-2">
											<span className="text-gray-500 text-sm">
												Background Color
											</span>
											<RgbInput
												value={captionSettings.backgroundColor || "#000000"}
												onChange={(value) =>
													updateCaptionSetting("backgroundColor", value)
												}
											/>
										</div>

										<div className="flex flex-col gap-2">
											<span className="text-gray-500 text-sm">
												Background Opacity
											</span>
											<Slider
												value={[captionSettings.backgroundOpacity || 80]}
												onChange={(v) =>
													updateCaptionSetting("backgroundOpacity", v[0])
												}
												minValue={0}
												maxValue={100}
												step={1}
											/>
										</div>
									</div>
								</Field>

								{/* Position Settings */}
								<Field name="Position" icon={<MessageSquare className="size-4" />}>
									<KSelect<string>
										options={["top", "bottom"]}
										value={captionSettings.position || "bottom"}
										onChange={(value) => {
											if (value === null) return;
											updateCaptionSetting("position", value);
										}}
										itemComponent={(props) => (
											<MenuItem as={KSelect.Item} item={props.item}>
												<KSelect.ItemLabel className="flex-1 capitalize">
													{props.item.rawValue}
												</KSelect.ItemLabel>
											</MenuItem>
										)}
									>
										<KSelect.Trigger className="w-full flex items-center justify-between rounded-lg shadow px-3 py-2 bg-white border border-gray-300">
											<KSelect.Value<string>>
												{(state) => (
													<span className="capitalize">
														{state.selectedOption()}
													</span>
												)}
											</KSelect.Value>
											<KSelect.Icon>
												<ChevronDown className="size-4" />
											</KSelect.Icon>
										</KSelect.Trigger>
										<KSelect.Portal>
											<PopperContent
												as={KSelect.Content}
												className={topLeftAnimateClasses}
											>
												<MenuItemList as={KSelect.Listbox} />
											</PopperContent>
										</KSelect.Portal>
									</KSelect>
								</Field>

								{/* Style Options */}
								<Field name="Style Options" icon={<MessageSquare className="size-4" />}>
									<div className="space-y-3">
										<div className="flex flex-col gap-4">
											<Subfield name="Bold">
												<Toggle
													checked={captionSettings.bold}
													onChange={(checked) =>
														updateCaptionSetting("bold", checked)
													}
												/>
											</Subfield>
											<Subfield name="Italic">
												<Toggle
													checked={captionSettings.italic}
													onChange={(checked) =>
														updateCaptionSetting("italic", checked)
													}
												/>
											</Subfield>
											<Subfield name="Outline">
												<Toggle
													checked={captionSettings.outline}
													onChange={(checked) =>
														updateCaptionSetting("outline", checked)
													}
												/>
											</Subfield>
										</div>

										{captionSettings.outline && (
											<div className="flex flex-col gap-2">
												<span className="text-gray-500 text-sm">Outline Color</span>
												<RgbInput
													value={captionSettings.outlineColor || "#000000"}
													onChange={(value) =>
														updateCaptionSetting("outlineColor", value)
													}
												/>
											</div>
										)}
									</div>
								</Field>

								{/* Export Options */}
								<Field name="Export Options" icon={<MessageSquare className="size-4" />}>
									<Subfield name="Export with Subtitles">
										<Toggle
											checked={captionSettings.exportWithSubtitles}
											onChange={(checked) =>
												updateCaptionSetting("exportWithSubtitles", checked)
											}
										/>
									</Subfield>
								</Field>

								{/* Caption Segments Section */}
								{project.captions?.segments && project.captions.segments.length > 0 && (
									<Field
										name="Caption Segments"
										icon={<MessageSquare className="size-4" />}
									>
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<Button
													onClick={() => addSegment(editorState.playbackTime)}
													className="w-full"
												>
													Add at Current Time
												</Button>
											</div>

											<div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
												{project.captions.segments.length === 0 ? (
													<p className="text-sm text-gray-500">
														No caption segments found.
													</p>
												) : (
													project.captions.segments.map((segment) => (
														<div
															key={segment.id}
															className="bg-gray-50 dark:bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-4"
														>
															<div className="flex flex-col space-y-4">
																<div className="flex space-x-4">
																	<div className="flex-1">
																		<label className="text-xs text-gray-400 dark:text-gray-500">
																			Start Time
																		</label>
																		<Input
																			type="number"
																			className="w-full"
																			value={segment.start.toFixed(1)}
																			step="0.1"
																			min={0}
																			onChange={(e) =>
																				updateSegment(segment.id, {
																					start: parseFloat(e.target.value),
																				})
																			}
																		/>
																	</div>
																	<div className="flex-1">
																		<label className="text-xs text-gray-400 dark:text-gray-500">
																			End Time
																		</label>
																		<Input
																			type="number"
																			className="w-full"
																			value={segment.end.toFixed(1)}
																			step="0.1"
																			min={segment.start}
																			onChange={(e) =>
																				updateSegment(segment.id, {
																					end: parseFloat(e.target.value),
																				})
																			}
																		/>
																	</div>
																</div>

																<div className="space-y-2">
																	<label className="text-xs text-gray-400 dark:text-gray-500">
																		Caption Text
																	</label>
																	<div className="w-full px-3 py-2 bg-white dark:bg-gray-50 border border-gray-200 rounded-lg text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
																		<textarea
																			className="w-full resize-none outline-none bg-transparent text-[--text-primary]"
																			value={segment.text}
																			rows={2}
																			onChange={(e) =>
																				updateSegment(segment.id, {
																					text: e.target.value,
																				})
																			}
																		/>
																	</div>
																</div>

																<div className="flex justify-end">
																	<Button
																		variant="destructive"
																		size="sm"
																		onClick={() => deleteSegment(segment.id)}
																		className="text-gray-50 dark:text-gray-500 inline-flex items-center gap-1.5"
																	>
																		<IconDelete />
																		Delete
																	</Button>
																</div>
															</div>
														</div>
													))
												)}
											</div>
										</div>
									</Field>
								)}
							</div>
						)}
					</div>
				</Field>
			</div>
		</div>
	);
}
