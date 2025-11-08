"use client";

import { Button } from "./ui";
import { cx } from "cva";
import { useState, useEffect, useRef, useCallback } from "react";
import Tooltip from "~/components/Tooltip";
import { trackEvent } from "~/app/utils/analytics";
import { useEditorContext } from "./context/EditorContext";
import PresetsDropdown from "./PresetsDropdown";
import ShareButton from "./ShareButton";
import { EditorButton } from "./ui";
import { Trash2, Folder, MessageSquare, Gauge, Undo2, Redo2 } from "lucide-react";

export type ResolutionOption = {
	label: string;
	value: string;
	width: number;
	height: number;
};

export const RESOLUTION_OPTIONS = {
	_720p: { label: "720p", value: "720p", width: 1280, height: 720 },
	_1080p: { label: "1080p", value: "1080p", width: 1920, height: 1080 },
	_4k: { label: "4K", value: "4k", width: 3840, height: 2160 },
};

export interface ExportEstimates {
	duration_seconds: number;
	estimated_time_seconds: number;
	estimated_size_mb: number;
}

export function EditorHeader() {
	const {
		videoData,
		projectHistory,
		setDialog,
		exportState,
		setExportState,
		customDomain,
		editorState,
		setEditorState,
	} = useEditorContext();

	const clearTimelineSelection = useCallback(() => {
		if (!editorState.timeline.selection) return false;
		setEditorState((prev) => ({
			...prev,
			timeline: {
				...prev.timeline,
				selection: null,
			},
		}));
		return true;
	}, [editorState.timeline.selection, setEditorState]);

	const handleDelete = useCallback(async () => {
		clearTimelineSelection();
		if (!confirm("Are you sure you want to delete this recording?")) return;
		// TODO: Implement API endpoint for deleting video
		console.log("Delete video:", videoData?.id);
	}, [clearTimelineSelection, videoData]);

	const handleOpenBundle = useCallback(() => {
		clearTimelineSelection();
		// TODO: For web, this could open the video in a new tab or download it
		console.log("Open bundle for video:", videoData?.id);
	}, [clearTimelineSelection, videoData]);

	const handleExport = useCallback(() => {
		clearTimelineSelection();
		trackEvent("export_button_clicked");
		if (exportState && "type" in exportState && exportState.type === "done") {
			setExportState({ type: "idle" });
		}
		setDialog({ type: "export", open: true });
	}, [clearTimelineSelection, exportState, setExportState, setDialog]);

	return (
		<div className="flex relative flex-row items-center w-full h-14">
			<div className={cx("flex flex-row flex-1 gap-2 items-center px-4 h-full")}>
				<EditorButton
					onClick={handleDelete}
					tooltipText="Delete recording"
					leftIcon={<Trash2 className="w-5" />}
				/>
				<EditorButton
					onClick={handleOpenBundle}
					tooltipText="Open recording bundle"
					leftIcon={<Folder className="w-5" />}
				/>
				<div className="flex flex-row items-center">
					<NameEditor name={videoData?.name ?? "Untitled"} />
					<span className="text-sm text-gray-11">.cap</span>
				</div>
				<div className="flex-1 h-full" />
				<EditorButton
					onClick={() => {
						if (clearTimelineSelection()) return;
					}}
					tooltipText="Captions"
					leftIcon={<MessageSquare className="w-5" />}
					comingSoon={true}
				/>
				<EditorButton
					onClick={() => {
						if (clearTimelineSelection()) return;
					}}
					tooltipText="Performance"
					leftIcon={<Gauge className="w-[18px]" />}
					comingSoon={true}
				/>
			</div>

			<div className="flex flex-col justify-center px-4 border-x border-black-transparent-10">
				<PresetsDropdown />
			</div>

			<div className={cx("flex-1 h-full flex flex-row items-center gap-2 pl-2 pr-2")}>
				<EditorButton
					onClick={() => {
						clearTimelineSelection();
						if (!projectHistory.canUndo()) return;
						projectHistory.undo();
					}}
					disabled={!projectHistory.canUndo() && !editorState.timeline.selection}
					tooltipText="Undo"
					leftIcon={<Undo2 className="w-5" />}
				/>
				<EditorButton
					onClick={() => {
						clearTimelineSelection();
						if (!projectHistory.canRedo()) return;
						projectHistory.redo();
					}}
					disabled={!projectHistory.canRedo() && !editorState.timeline.selection}
					tooltipText="Redo"
					leftIcon={<Redo2 className="w-5" />}
				/>
				<div className="flex-1 h-full" />
				{customDomain.data?.custom_domain && <ShareButton />}
				<Button
					variant="dark"
					className="flex gap-1.5 justify-center h-[40px] w-full max-w-[100px]"
					onClick={handleExport}
				>
					<UploadIcon className="text-gray-1 size-4" />
					Export
				</Button>
			</div>
		</div>
	);
}

const UploadIcon = (props: React.ComponentProps<"svg">) => {
	const { exportState } = useEditorContext();
	const isExporting =
		exportState &&
		"type" in exportState &&
		exportState.type !== "idle" &&
		exportState.type !== "done";
	return (
		<svg
			width={20}
			height={20}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M16.6667 10.625V14.1667C16.6667 15.5474 15.5474 16.6667 14.1667 16.6667H5.83333C4.45262 16.6667 3.33333 15.5474 3.33333 14.1667V10.625"
				stroke="currentColor"
				strokeWidth={1.66667}
				strokeLinecap="round"
				strokeLinejoin="round"
				className="upload-base"
			/>
			<path
				d="M9.99999 3.33333V12.7083M9.99999 3.33333L13.75 7.08333M9.99999 3.33333L6.24999 7.08333"
				stroke="currentColor"
				strokeWidth={1.66667}
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cx(isExporting && "bounce")}
			/>
		</svg>
	);
};

function NameEditor({ name }: { name: string }) {
	const { refetchVideo } = useEditorContext();
	const [prettyName, setPrettyName] = useState(name);
	const [truncated, setTruncated] = useState(false);
	const prettyNameRef = useRef<HTMLInputElement>(null);
	const prettyNameMeasureRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		setPrettyName(name);
	}, [name]);

	useEffect(() => {
		if (!prettyNameRef.current || !prettyNameMeasureRef.current) return;
		if (prettyNameMeasureRef.current) {
			prettyNameMeasureRef.current.textContent = prettyName;
		}
		const inputWidth = prettyNameRef.current.offsetWidth;
		const textWidth = prettyNameMeasureRef.current.offsetWidth;
		setTruncated(inputWidth < textWidth);
	}, [prettyName]);

	const handleBlur = useCallback(async () => {
		const trimmed = prettyName.trim();
		if (trimmed.length < 5 || trimmed.length > 100) {
			setPrettyName(name);
			return;
		}
		if (trimmed && trimmed !== name) {
			// TODO: Implement API endpoint for updating video name
			console.log("Update video name:", trimmed);
			refetchVideo();
		}
	}, [prettyName, name, refetchVideo]);

	return (
		<Tooltip disabled={!truncated} content={name}>
			<div className="flex relative flex-row items-center text-sm font-normal font-inherit tracking-inherit text-gray-12">
				<input
					ref={prettyNameRef}
					className={cx(
						"absolute inset-0 px-px m-0 opacity-0 overflow-hidden focus:opacity-100 bg-transparent border-b border-transparent focus:border-gray-7 focus:outline-none peer whitespace-pre",
						truncated && "truncate",
						(prettyName.length < 5 || prettyName.length > 100) && "focus:border-red-500",
					)}
					value={prettyName}
					onChange={(e) => setPrettyName(e.currentTarget.value)}
					onBlur={handleBlur}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === "Escape") {
							prettyNameRef.current?.blur();
						}
					}}
				/>
				<span
					ref={prettyNameMeasureRef}
					className="pointer-events-none max-w-[200px] px-px m-0 peer-focus:opacity-0 border-b border-transparent truncate whitespace-pre"
				/>
			</div>
		</Tooltip>
	);
}
