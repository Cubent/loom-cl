"use client";

import { Select as KSelect } from "~/components/kobalte-compat";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { cx } from "cva";
import { toast } from "sonner";
import { SignInButton } from "~/components/SignInButton";
import Tooltip from "~/components/Tooltip";
import { trackEvent } from "~/app/utils/analytics";
import type {
	ExportCompression,
	ExportFormat,
	FramesRendered,
	RenderState,
} from "./types";
import { RESOLUTION_OPTIONS, type ExportEstimates } from "./EditorHeader";
import { useEditorContext } from "./context/EditorContext";
import {
	Button,
	Dialog,
	DialogContent,
	MenuItem,
	MenuItemList,
	PopperContent,
	topSlideAnimateClasses,
} from "./ui";
import {
	File,
	Copy,
	Link as LinkIcon,
	ChevronDown,
	XCircle,
	Camera,
	Monitor,
	HardDrive,
	Clock,
	Check,
} from "lucide-react";

class SilentError extends Error {}

export const COMPRESSION_OPTIONS: Array<{
	label: string;
	value: ExportCompression;
}> = [
	{ label: "Minimal", value: "Minimal" },
	{ label: "Social Media", value: "Social" },
	{ label: "Web", value: "Web" },
	{ label: "Potato", value: "Potato" },
];

export const FPS_OPTIONS = [
	{ label: "15 FPS", value: 15 },
	{ label: "30 FPS", value: 30 },
	{ label: "60 FPS", value: 60 },
] as const;

export const GIF_FPS_OPTIONS = [
	{ label: "10 FPS", value: 10 },
	{ label: "15 FPS", value: 15 },
	{ label: "20 FPS", value: 20 },
	{ label: "25 FPS", value: 25 },
	{ label: "30 FPS", value: 30 },
] as const;

export const EXPORT_TO_OPTIONS = [
	{
		label: "File",
		value: "file",
		icon: <File className="text-gray-12 size-3.5" />,
	},
	{
		label: "Clipboard",
		value: "clipboard",
		icon: <Copy className="text-gray-12 size-3.5" />,
	},
	{
		label: "Shareable link",
		value: "link",
		icon: <LinkIcon className="text-gray-12 size-3.5" />,
	},
] as const;

const FORMAT_OPTIONS = [
	{ label: "MP4", value: "Mp4" },
	{ label: "GIF", value: "Gif" },
] as { label: string; value: ExportFormat; disabled?: boolean }[];

type ExportToOption = (typeof EXPORT_TO_OPTIONS)[number]["value"];

interface Settings {
	format: ExportFormat;
	fps: number;
	exportTo: ExportToOption;
	resolution: { label: string; value: string; width: number; height: number };
	compression: ExportCompression;
	organizationId?: string | null;
}

// Load settings from localStorage
function loadSettings(): Settings {
	const stored = localStorage.getItem("export_settings");
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch {
			// Invalid JSON, use defaults
		}
	}
	return {
		format: "Mp4",
		fps: 30,
		exportTo: "file",
		resolution: { label: "720p", value: "720p", width: 1280, height: 720 },
		compression: "Minimal",
	};
}

// Save settings to localStorage
function saveSettings(settings: Settings) {
	localStorage.setItem("export_settings", JSON.stringify(settings));
}

export function ExportDialog() {
	const {
		dialog,
		setDialog,
		project,
		setExportState,
		exportState,
		videoData,
	} = useEditorContext();

	const hasTransparentBackground = useMemo(() => {
		const backgroundSource = project.background.source;
		return (
			backgroundSource.type === "color" &&
			backgroundSource.alpha !== undefined &&
			backgroundSource.alpha < 255
		);
	}, [project.background.source]);

	const [_settings, setSettings] = useState<Settings>(loadSettings);

	// Save settings to localStorage when they change
	useEffect(() => {
		saveSettings(_settings);
	}, [_settings]);

	// Compute effective settings with overrides
	const settings = useMemo(() => {
		const ret: Settings = { ..._settings };

		// Auto-switch to GIF if transparent background and MP4 selected
		if (hasTransparentBackground && _settings.format === "Mp4") {
			ret.format = "Gif";
		}
		// Ensure GIF is not selected when exportTo is "link"
		else if (_settings.format === "Gif" && _settings.exportTo === "link") {
			ret.format = "Mp4";
		}
		// Ensure valid format
		else if (!["Mp4", "Gif"].includes(_settings.format)) {
			ret.format = "Mp4";
		}

		return ret;
	}, [_settings, hasTransparentBackground]);

	// Fetch organizations
	const { data: organizations = [] } = useQuery<Array<{ id: string; name: string }>>({
		queryKey: ["organizations"],
		queryFn: async () => {
			const response = await fetch("/api/desktop/organizations");
			if (!response.ok) throw new Error("Failed to fetch organizations");
			return response.json();
			},
		});

	// Get effective organizationId
	const effectiveOrganizationId = useMemo(() => {
		if (settings.organizationId) return settings.organizationId;
		if (organizations.length > 0 && organizations[0]) return organizations[0].id;
		return null;
	}, [settings.organizationId, organizations]);

	// Fetch export estimates
	const { data: exportEstimates } = useQuery<ExportEstimates>({
		queryKey: [
			"exportEstimates",
			{
				resolution: {
					x: settings.resolution.width,
					y: settings.resolution.height,
				},
				fps: settings.fps,
			},
		],
		queryFn: async ({ queryKey }) => {
			const [, { resolution, fps }] = queryKey as [
				string,
				{ resolution: { x: number; y: number }; fps: number },
			];
			// For web, call API endpoint to get estimates
			if (!videoData?.id) throw new Error("Video ID is required");
			const response = await fetch(
				`/api/video/${videoData.id}/export-estimates`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ resolution, fps }),
				},
			);
			if (!response.ok) throw new Error("Failed to get export estimates");
			return response.json();
		},
		enabled: !!videoData?.id,
		placeholderData: keepPreviousData,
	});

	const exportButtonIcon: Record<"file" | "clipboard" | "link", React.ReactNode> =
		{
			file: <File className="text-gray-1 size-3.5" />,
			clipboard: <Copy className="text-gray-1 size-3.5" />,
			link: <LinkIcon className="text-gray-1 size-3.5" />,
		};

	const [outputPath, setOutputPath] = useState<string | null>(null);

	// Check authentication
	const { data: auth } = useQuery<{ user?: { id: string } } | null>({
		queryKey: ["auth"],
		queryFn: async () => {
			const response = await fetch("/api/auth/session");
			if (!response.ok) return null;
			return response.json();
		},
	});

	const copy = useMutation({
		mutationFn: async () => {
			if (exportState.type !== "idle") return;

			setExportState({ action: "copy", type: "starting" });

			// For web, export video and copy to clipboard
			// This would call an API endpoint that exports the video
			const response = await fetch(`/api/video/${videoData?.id}/export`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					format: settings.format === "Mp4" ? "Mp4" : "Gif",
					fps: settings.fps,
					resolution_base: {
						x: settings.resolution.width,
						y: settings.resolution.height,
					},
					compression: settings.format === "Mp4" ? settings.compression : undefined,
					quality: settings.format === "Gif" ? null : undefined,
				}),
			});

			if (!response.ok) throw new Error("Failed to export video");

			// Simulate progress updates
			setExportState({ action: "copy", type: "rendering", progress: {
				renderedCount: 0,
				totalFrames: Math.floor((videoData?.duration || 0) * settings.fps),
				type: "FramesRendered",
			} });

			// Wait for export to complete
			const blob = await response.blob();

			setExportState({ action: "copy", type: "copying" });

			// Copy to clipboard
			await navigator.clipboard.write([
				new ClipboardItem({ [blob.type]: blob }),
			]);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to copy recording",
			);
			setExportState({ type: "idle" });
		},
		onSuccess() {
			setExportState({ action: "copy", type: "done" });
			if (!dialog.open) {
				toast.success(
					`${settings.format === "Gif" ? "GIF" : "Recording"} exported to clipboard`,
				);
			}
		},
	});

	const save = useMutation({
		mutationFn: async () => {
			if (exportState.type !== "idle") return;

			const extension = settings.format === "Gif" ? "gif" : "mp4";

			// For web, trigger download
			setExportState({ action: "save", type: "starting" });

			trackEvent("export_started", {
				resolution: settings.resolution,
				fps: settings.fps,
				path: "download",
			});

			// Export video
			const response = await fetch(`/api/video/${videoData?.id}/export`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					format: settings.format === "Mp4" ? "Mp4" : "Gif",
					fps: settings.fps,
					resolution_base: {
						x: settings.resolution.width,
						y: settings.resolution.height,
					},
					compression: settings.format === "Mp4" ? settings.compression : undefined,
					quality: settings.format === "Gif" ? null : undefined,
				}),
			});

			if (!response.ok) throw new Error("Failed to export video");

			// Simulate progress
			setExportState({ action: "save", type: "rendering", progress: {
				renderedCount: 0,
				totalFrames: Math.floor((videoData?.duration || 0) * settings.fps),
				type: "FramesRendered",
			} });

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${videoData?.name || "video"}.${extension}`;
			a.click();
			URL.revokeObjectURL(url);

			setExportState({ action: "save", type: "copying" });
			setOutputPath(url);

			setExportState({ action: "save", type: "done" });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: `Failed to export recording: ${error}`,
			);
			setExportState({ type: "idle" });
		},
		onSuccess() {
			if (!dialog.open) {
				toast.success(
					`${settings.format === "Gif" ? "GIF" : "Recording"} exported to file`,
				);
			}
		},
	});

	const upload = useMutation({
		mutationFn: async () => {
			if (exportState.type !== "idle") return;

			setExportState({ action: "upload", type: "starting" });

			trackEvent("create_shareable_link_clicked", {
				resolution: settings.resolution,
				fps: settings.fps,
				has_existing_auth: !!auth,
			});

			// Check if user is authenticated
			if (!auth) {
				throw new Error("You need to sign in to share recordings");
			}

			// Export video
			const exportResponse = await fetch(`/api/video/${videoData?.id}/export`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					format: settings.format === "Mp4" ? "Mp4" : "Gif",
					fps: settings.fps,
					resolution_base: {
						x: settings.resolution.width,
						y: settings.resolution.height,
					},
					compression: settings.format === "Mp4" ? settings.compression : undefined,
					quality: settings.format === "Gif" ? null : undefined,
				}),
			});

			if (!exportResponse.ok) throw new Error("Failed to export video");

			// Simulate rendering progress
			setExportState({ action: "upload", type: "rendering", progress: {
				renderedCount: 0,
				totalFrames: Math.floor((videoData?.duration || 0) * settings.fps),
				type: "FramesRendered",
			} });

			const blob = await exportResponse.blob();

			// Upload video
			setExportState({ action: "upload", type: "uploading", progress: 0 });

			const formData = new FormData();
			formData.append("file", blob, `${videoData?.name || "video"}.${settings.format === "Gif" ? "gif" : "mp4"}`);
			if (effectiveOrganizationId) {
				formData.append("organizationId", effectiveOrganizationId);
			}

			const uploadResponse = await fetch(`/api/video/${videoData?.id}/upload`, {
				method: "POST",
				body: formData,
			});

			if (!uploadResponse.ok) {
				const error = await uploadResponse.json();
				if (error.message === "NotAuthenticated") {
				throw new Error("You need to sign in to share recordings");
				} else if (error.message === "PlanCheckFailed") {
				throw new Error("Failed to verify your subscription status");
				} else if (error.message === "UpgradeRequired") {
				throw new Error("This feature requires an upgraded plan");
				}
				throw new Error("Failed to upload recording");
			}

			// Simulate upload progress
			const reader = uploadResponse.body?.getReader();
			if (reader) {
				let loaded = 0;
				const contentLength = parseInt(
					uploadResponse.headers.get("content-length") || "0",
					10,
				);
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					loaded += value.length;
					const progress = contentLength > 0 ? (loaded / contentLength) * 100 : 0;
					setExportState({ action: "upload", type: "uploading", progress });
				}
			}
		},
		onSuccess: async () => {
			const d = dialog;
			if (d.open && "type" in d && d.type === "export") {
				setDialog({ ...d, open: true });
			}
			setExportState({ action: "upload", type: "done" });
		},
		onError: (error) => {
			console.error(error);
			if (!(error instanceof SilentError)) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to upload recording",
				);
			}
			setExportState({ type: "idle" });
		},
	});

	const formatTime = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<>
			{exportState.type === "idle" && (
				<DialogContent
					title="Export Cap"
					confirm={
						settings.exportTo === "link" && !auth ? (
							<SignInButton>
								{exportButtonIcon[settings.exportTo]}
								<span className="ml-1.5">Sign in to share</span>
							</SignInButton>
						) : (
							<Button
								className="flex gap-1.5 items-center"
								variant="dark"
								onClick={() => {
									if (settings.exportTo === "file") save.mutate();
									else if (settings.exportTo === "link") upload.mutate();
									else copy.mutate();
								}}
							>
								Export to
								{exportButtonIcon[settings.exportTo]}
							</Button>
						)
					}
					leftFooterContent={
						<div
							className={cx(
								"flex overflow-hidden z-40 justify-between items-center max-w-full text-xs font-medium transition-all pointer-events-none",
							)}
						>
							{exportEstimates && (
								<p className="flex gap-4 items-center">
									<span className="flex items-center text-gray-12">
										<Camera className="w-[14px] h-[14px] mr-1.5 text-gray-12" />
										{formatTime(exportEstimates.duration_seconds)}
											</span>
									<span className="flex items-center text-gray-12">
										<Monitor className="w-[14px] h-[14px] mr-1.5 text-gray-12" />
												{settings.resolution.width}×{settings.resolution.height}
											</span>
									<span className="flex items-center text-gray-12">
										<HardDrive className="w-[14px] h-[14px] mr-1.5 text-gray-12" />
										{exportEstimates.estimated_size_mb.toFixed(2)} MB
											</span>
									<span className="flex items-center text-gray-12">
										<Clock className="w-[14px] h-[14px] mr-1.5 text-gray-12" />
										~{formatTime(exportEstimates.estimated_time_seconds)}
											</span>
										</p>
									)}
						</div>
					}
				>
					<div className="flex flex-wrap gap-3">
						{/* Export to */}
						<div className="flex-1 p-4 rounded-xl dark:bg-gray-2 bg-gray-3">
							<div className="flex flex-col gap-3">
								<div className="flex flex-row justify-between items-center">
									<h3 className="text-gray-12">Export to</h3>
									{settings.exportTo === "link" && organizations.length > 1 && (
										<div
											className="text-sm text-gray-12 flex flex-row hover:opacity-60 transition-opacity duration-200 cursor-pointer"
											onClick={() => {
												// For web, show a dropdown menu (simplified)
												const selected = prompt(
													`Select organization:\n${organizations
														.map((org, idx) => `${idx + 1}. ${org.name}`)
														.join("\n")}`,
												);
												if (selected) {
													const idx = parseInt(selected) - 1;
													if (idx >= 0 && idx < organizations.length) {
														const org = organizations[idx];
														if (org) {
															setSettings((prev) => ({
																...prev,
																organizationId: org.id,
															}));
														}
													}
												}
											}}
										>
											<span className="opacity-70">Organization:</span>
											<span className="ml-1 flex flex-row">
												{organizations.find(
													(o) => o.id === effectiveOrganizationId,
												)?.name || organizations[0]?.name}
													<ChevronDown className="size-4" />
												</span>
											</div>
									)}
								</div>
								<div className="flex gap-2">
									{EXPORT_TO_OPTIONS.map((option) => (
											<Button
											key={option.value}
												onClick={() => {
												setSettings((prev) => {
													const newSettings = { ...prev, exportTo: option.value };
															// If switching to link and GIF is selected, change to MP4
															if (
																option.value === "link" &&
														prev.format === "Gif"
															) {
																newSettings.format = "Mp4";
															}
													return newSettings;
												});
												}}
												data-selected={settings.exportTo === option.value}
											className="flex flex-1 gap-2 items-center text-nowrap"
												variant="gray"
											>
												{option.icon}
												{option.label}
											</Button>
									))}
								</div>
							</div>
						</div>
						{/* Format */}
						<div className="p-4 rounded-xl dark:bg-gray-2 bg-gray-3">
							<div className="flex flex-col gap-3">
								<h3 className="text-gray-12">Format</h3>
								<div className="flex flex-row gap-2">
									{FORMAT_OPTIONS.map((option) => {
										const disabledReason =
											option.value === "Mp4" && hasTransparentBackground
												? "MP4 format does not support transparent backgrounds"
												: option.value === "Gif" && settings.exportTo === "link"
													? "Shareable links cannot be made from GIFs"
													: undefined;

											return (
												<Tooltip
												key={option.value}
												content={disabledReason}
												disabled={disabledReason === undefined}
												>
													<Button
														variant="gray"
														onClick={() => {
														setSettings((prev) => {
															const newSettings = {
																...prev,
																format: option.value as ExportFormat,
															};

																	if (
																		option.value === "Gif" &&
																		!(
																	prev.resolution.value === "720p" ||
																	prev.resolution.value === "1080p"
																		)
															) {
																		newSettings.resolution = {
																			...RESOLUTION_OPTIONS._720p,
																		};
															}

																	if (
																		option.value === "Gif" &&
																		GIF_FPS_OPTIONS.every(
																	(v) => v.value !== prev.fps,
																		)
															) {
																		newSettings.fps = 15;
															}

																	if (
																		option.value === "Mp4" &&
																FPS_OPTIONS.every((v) => v.value !== prev.fps)
															) {
																		newSettings.fps = 30;
															}

															return newSettings;
														});
														}}
														autofocus={false}
														data-selected={settings.format === option.value}
													disabled={!!disabledReason}
													>
														{option.label}
													</Button>
												</Tooltip>
											);
									})}
								</div>
							</div>
						</div>
						{/* Frame rate */}
						<div className="overflow-hidden relative p-4 rounded-xl dark:bg-gray-2 bg-gray-3">
							<div className="flex flex-col gap-3">
								<h3 className="text-gray-12">Frame rate</h3>
								<KSelect<{ label: string; value: number }>
									options={
										settings.format === "Gif" ? GIF_FPS_OPTIONS : FPS_OPTIONS
									}
									optionValue="value"
									optionTextValue="label"
									placeholder="Select FPS"
									value={(settings.format === "Gif"
										? GIF_FPS_OPTIONS
										: FPS_OPTIONS
									).find((opt) => opt.value === settings.fps)}
									onChange={(option: { label: string; value: number } | undefined) => {
										const value =
											option?.value ?? (settings.format === "Gif" ? 10 : 30);
										trackEvent("export_fps_changed", {
											fps: value,
										});
										setSettings((prev) => ({ ...prev, fps: value }));
									}}
									itemComponent={(props: { item: any }) => (
										<MenuItem as={KSelect.Item} item={props.item}>
											<KSelect.ItemLabel className="flex-1">
												{props.item.rawValue.label}
											</KSelect.ItemLabel>
										</MenuItem>
									)}
								>
									<KSelect.Trigger className="flex flex-row gap-2 items-center px-3 w-full h-10 rounded-xl transition-colors dark:bg-gray-3 bg-gray-4 disabled:text-gray-11">
										<KSelect.Value<
											(typeof FPS_OPTIONS)[number]
										> className="flex-1 text-sm text-left truncate tabular-nums text-[--gray-500]">
											{(state: { selectedOption: () => { label: string } | undefined }) => <span>{state.selectedOption()?.label}</span>}
										</KSelect.Value>
										<KSelect.Icon>
											<ChevronDown className="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180 text-[--gray-500]" />
										</KSelect.Icon>
									</KSelect.Trigger>
									<KSelect.Portal>
										<PopperContent
											as={KSelect.Content}
											className={cx(topSlideAnimateClasses, "z-50")}
										>
											<MenuItemList
												className="max-h-32 custom-scroll"
												as={KSelect.Listbox}
											/>
										</PopperContent>
									</KSelect.Portal>
								</KSelect>
							</div>
						</div>
						{/* Compression */}
						<div className="p-4 rounded-xl dark:bg-gray-2 bg-gray-3">
							<div className="flex flex-col gap-3">
								<h3 className="text-gray-12">Compression</h3>
								<div className="flex gap-2">
									{COMPRESSION_OPTIONS.map((option) => (
											<Button
											key={option.value}
												onClick={() => {
												setSettings((prev) => ({
													...prev,
													compression: option.value as ExportCompression,
												}));
												}}
												variant="gray"
												data-selected={settings.compression === option.value}
											>
												{option.label}
											</Button>
									))}
								</div>
							</div>
						</div>
						{/* Resolution */}
						<div className="flex-1 p-4 rounded-xl dark:bg-gray-2 bg-gray-3">
							<div className="flex flex-col gap-3">
								<h3 className="text-gray-12">Resolution</h3>
								<div className="flex gap-2">
									{(settings.format === "Gif"
												? [RESOLUTION_OPTIONS._720p, RESOLUTION_OPTIONS._1080p]
												: [
														RESOLUTION_OPTIONS._720p,
														RESOLUTION_OPTIONS._1080p,
														RESOLUTION_OPTIONS._4k,
													]
									).map((option) => (
											<Button
											key={option.value}
											data-selected={settings.resolution.value === option.value}
											className="flex-1"
												variant="gray"
											onClick={() =>
												setSettings((prev) => ({ ...prev, resolution: option }))
											}
											>
												{option.label}
											</Button>
									))}
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			)}
			{exportState.type !== "idle" && (
				<ExportProgressDialog
					exportState={exportState}
					settings={settings}
					outputPath={outputPath}
					setDialog={setDialog}
					dialog={dialog}
					videoData={videoData}
				/>
			)}
		</>
	);
}

function ExportProgressDialog({
	exportState,
	settings,
	outputPath,
	setDialog,
	dialog,
	videoData,
}: {
	exportState: Exclude<
		| { type: "idle" }
		| ({ action: "copy" } & (RenderState | { type: "copying" } | { type: "done" }))
		| ({ action: "save" } & (RenderState | { type: "copying" } | { type: "done" }))
		| ({ action: "upload" } & (RenderState | { type: "uploading"; progress: number } | { type: "done" })),
		{ type: "idle" }
	>;
	settings: Settings;
	outputPath: string | null;
	setDialog: React.Dispatch<React.SetStateAction<any>>;
	dialog: any;
	videoData: any;
}) {
	const [copyPressed, setCopyPressed] = useState(false);
	const [clipboardCopyPressed, setClipboardCopyPressed] = useState(false);
	const [showCompletionScreen, setShowCompletionScreen] = useState(
						exportState.type === "done" && exportState.action === "save",
					);

	useEffect(() => {
						if (exportState.type === "done" && exportState.action === "save") {
							setShowCompletionScreen(true);
						}
	}, [exportState.type, exportState.action]);

	// Get meta data (for sharing link)
	const { data: meta } = useQuery<{ sharing?: { link: string } } | null>({
		queryKey: ["video-meta", videoData?.id],
		queryFn: async () => {
			if (!videoData?.id) return null;
			const response = await fetch(`/api/video/${videoData.id}`);
			if (!response.ok) return null;
			return response.json();
		},
		enabled: !!videoData?.id,
					});

					return (
						<>
							<Dialog.Header>
				<div className="flex justify-between items-center w-full">
					<span className="text-gray-12">Export</span>
									<div
						onClick={() => setDialog((d: any) => ({ ...d, open: false }))}
						className="flex justify-center items-center p-1 rounded-full transition-colors cursor-pointer hover:bg-gray-3"
									>
						<XCircle className="text-gray-12 size-4" />
									</div>
								</div>
							</Dialog.Header>
			<Dialog.Content className="text-gray-12">
				<div className="relative z-10 px-5 py-4 mx-auto space-y-6 w-full text-center">
					{exportState.action === "copy" && (
						<div className="flex flex-col gap-4 justify-center items-center h-full">
							<h1 className="text-lg font-medium text-gray-12">
								{exportState.type === "starting"
															? "Preparing..."
									: exportState.type === "rendering"
																? settings.format === "Gif"
																	? "Rendering GIF..."
																	: "Rendering video..."
										: exportState.type === "copying"
																	? "Copying to clipboard..."
																	: "Copied to clipboard"}
													</h1>
							{(exportState.type === "rendering" ||
								exportState.type === "starting") && (
								<RenderProgress state={exportState} format={settings.format} />
							)}
												</div>
											)}
					{exportState.action === "save" && (
						<div className="flex flex-col gap-4 justify-center items-center h-full">
							{showCompletionScreen && exportState.type === "done" ? (
								<div className="flex flex-col gap-6 items-center duration-500 animate-in fade-in">
									<div className="flex flex-col gap-3 items-center">
										<div className="flex justify-center items-center mb-2 rounded-full bg-gray-12 size-10">
											<Check className="text-gray-1 size-5" />
										</div>
										<div className="flex flex-col gap-1 items-center">
											<h1 className="text-xl font-medium text-gray-12">
												Export Completed
											</h1>
											<p className="text-sm text-gray-11">
												Your{" "}
												{settings.format === "Gif" ? "GIF" : "video"}{" "}
												has successfully been exported
											</p>
										</div>
									</div>
								</div>
							) : (
								<>
									<h1 className="text-lg font-medium text-gray-12">
										{exportState.type === "starting"
																		? "Preparing..."
											: exportState.type === "rendering"
																			? settings.format === "Gif"
																				? "Rendering GIF..."
																				: "Rendering video..."
												: exportState.type === "copying"
																				? "Exporting to file..."
																				: "Export completed"}
																</h1>
									{(exportState.type === "rendering" ||
										exportState.type === "starting") && (
										<RenderProgress state={exportState} format={settings.format} />
									)}
								</>
							)}
												</div>
											)}
					{exportState.action === "upload" && (
						<>
							{exportState.type !== "done" ? (
								<div className="flex flex-col gap-4 justify-center items-center">
									<h1 className="text-lg font-medium text-center text-gray-12">
																	Uploading Cap...
																</h1>
									{exportState.type === "uploading" ? (
																			<ProgressView
											amount={exportState.progress}
											label={`Uploading - ${Math.floor(exportState.progress)}%`}
										/>
									) : exportState.type === "rendering" ||
										exportState.type === "starting" ? (
										<RenderProgress state={exportState} format={settings.format} />
									) : null}
															</div>
							) : (
								<div className="flex flex-col gap-5 justify-center items-center">
									<div className="flex flex-col gap-1 items-center">
										<h1 className="mx-auto text-lg font-medium text-center text-gray-12">
																	Upload Complete
																</h1>
										<p className="text-sm text-gray-11">
																	Your Cap has been uploaded successfully
																</p>
															</div>
														</div>
											)}
						</>
					)}
								</div>
							</Dialog.Content>
							<Dialog.Footer>
				{exportState.action === "upload" && exportState.type === "done" && meta?.sharing?.link && (
					<div className="relative">
						<a
							href={meta.sharing!.link}
											target="_blank"
											rel="noreferrer"
							className="block"
										>
											<Button
												onClick={() => {
													setCopyPressed(true);
													setTimeout(() => {
														setCopyPressed(false);
													}, 2000);
									navigator.clipboard.writeText(meta.sharing.link);
												}}
												variant="dark"
								className="flex gap-2 justify-center items-center"
											>
								{!copyPressed ? (
									<Copy className="transition-colors duration-200 text-gray-1 size-4 group-hover:text-gray-12" />
												) : (
									<Check className="transition-colors duration-200 text-gray-1 size-4 svgpathanimation group-hover:text-gray-12" />
												)}
												<p>Open Link</p>
											</Button>
										</a>
									</div>
				)}

				{exportState.action === "save" && exportState.type === "done" && (
					<div className="flex gap-4 w-full">
										<Button
											variant="dark"
							className="flex gap-2 items-center"
											onClick={() => {
								// For web, open file in new tab if URL is available
								if (outputPath) {
									window.open(outputPath, "_blank");
								}
							}}
						>
							<File className="size-4" />
											Open File
										</Button>
										<Button
											variant="dark"
							className="flex gap-2 items-center"
											onClick={async () => {
								if (outputPath) {
													setClipboardCopyPressed(true);
													setTimeout(() => {
														setClipboardCopyPressed(false);
													}, 2000);
									// For web, copy file URL to clipboard
									await navigator.clipboard.writeText(outputPath);
													toast.success(
														`${
															settings.format === "Gif" ? "GIF" : "Video"
										} link copied to clipboard`,
													);
												}
											}}
										>
							{!clipboardCopyPressed ? (
								<Copy className="size-4" />
											) : (
								<Check className="size-4 svgpathanimation" />
											)}
											Copy to Clipboard
										</Button>
									</div>
				)}
							</Dialog.Footer>
		</>
	);
}

function RenderProgress({
	state,
	format,
}: {
	state: RenderState;
	format?: ExportFormat;
}) {
	return (
		<ProgressView
			amount={
				state.type === "rendering"
					? (state.progress.renderedCount / state.progress.totalFrames) * 100
					: 0
			}
			label={
				state.type === "rendering"
					? `Rendering ${format === "Gif" ? "GIF" : "video"} (${
							state.progress.renderedCount
						}/${state.progress.totalFrames} frames)`
					: "Preparing to render..."
			}
		/>
	);
}

function ProgressView({ amount, label }: { amount: number; label?: string }) {
	return (
		<>
			<div className="w-full bg-gray-3 rounded-full h-2.5">
				<div
					className="bg-blue-9 h-2.5 rounded-full transition-all duration-300"
					style={{ width: `${amount}%` }}
				/>
			</div>
			{label && <p className="text-xs tabular-nums">{label}</p>}
		</>
	);
}
