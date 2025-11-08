"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { EditorContextProvider, FPS, OUTPUT_SIZE, useEditorContext } from "./context/EditorContext";
import { EditorHeader } from "./EditorHeader";
import { EditorPlayer } from "./EditorPlayer";
import { EditorSidebar } from "./EditorSidebar";
import { Timeline } from "./timeline";
import { ExportDialog } from "./ExportDialog";
import { Dialog, DialogContent, EditorButton, Input, Subfield } from "./ui";
import { Toggle } from "~/components/Toggle";
import {
	CROP_ZERO,
	type CropBounds,
	Cropper,
	type CropperRef,
	createCropOptionsMenuItems,
	type Ratio,
} from "~/components/Cropper";
import { NumberField } from "~/components/NumberField";
import { Button } from "./ui";
import { Maximize2 } from "lucide-react";
import { XCircle } from "lucide-react";

interface StudioEditorProps {
	videoId: string;
	userId: string;
}

export function StudioEditor({ videoId, userId }: StudioEditorProps) {
	return (
		<EditorContextProvider videoId={videoId} userId={userId}>
			<Inner />
		</EditorContextProvider>
	);
}

function Inner() {
	const { project, editorState, setEditorState } = useEditorContext();

	// Remove Tauri-specific frame rendering - web will use canvas from video element
	// const renderFrame = throttle((time: number) => {
	// 	if (!editorState.playing) {
	// 		events.renderFrameEvent.emit({
	// 			frame_number: Math.max(Math.floor(time * FPS), 0),
	// 			fps: FPS,
	// 			resolution_base: OUTPUT_SIZE,
	// 		});
	// 	}
	// }, 1000 / FPS);

	const frameNumberToRender = useMemo(() => {
		const preview = editorState.previewTime;
		if (preview !== null) return preview;
		return editorState.playbackTime;
	}, [editorState.previewTime, editorState.playbackTime]);

	return (
		<>
			<EditorHeader />
			<div className="flex overflow-y-hidden flex-col flex-1 gap-2 pb-4 w-full min-h-0 leading-5 animate-in fade-in">
				<div className="flex overflow-hidden flex-col flex-1 min-h-0">
					<div className="flex overflow-y-hidden flex-row flex-1 min-h-0 gap-2 px-2 pb-0.5">
						<EditorPlayer />
						<EditorSidebar />
					</div>
					<Timeline />
				</div>
				<Dialogs />
			</div>
		</>
	);
}

function Dialogs() {
	const { dialog, setDialog, presets, project } = useEditorContext();

	const dialogValue = typeof dialog === "function" ? dialog() : dialog;
	const dialogType = dialogValue && "type" in dialogValue ? dialogValue.type : null;

	const size = dialogType === "crop" ? "lg" : "sm";
	const contentClass = dialogType === "export" ? "max-w-[740px]" : "";

	return (
		<Dialog.Root
			size={size}
			contentClass={contentClass}
			open={dialogValue?.open ?? false}
			onOpenChange={(o) => {
				if (!o) setDialog((d) => ({ ...d, open: false }));
			}}
		>
			{dialogType && (
				<>
					{dialogType === "export" && <ExportDialog />}
					{dialogType === "createPreset" && <CreatePresetDialog />}
					{dialogType === "renamePreset" && <RenamePresetDialog />}
					{dialogType === "deletePreset" && <DeletePresetDialog />}
					{dialogType === "crop" && <CropDialog />}
				</>
			)}
		</Dialog.Root>
	);
}

function CreatePresetDialog() {
	const { presets, project, setDialog } = useEditorContext();
	const [form, setForm] = useState({ name: "", default: false });

	const createPreset = useMutation({
		mutationFn: async () => {
			await presets.createPreset({ ...form, config: project });
		},
		onSuccess: () => {
			setDialog((d) => ({ ...d, open: false }));
		},
	});

	return (
		<DialogContent
			title="Create Preset"
			confirm={
				<Dialog.ConfirmButton
					disabled={createPreset.isPending}
					onClick={() => createPreset.mutate()}
				>
					Create
				</Dialog.ConfirmButton>
			}
		>
			<Subfield name="Name" required />
			<Input
				className="mt-2"
				value={form.name}
				placeholder="Enter preset name..."
				onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
			/>
			<Subfield name="Set as default" className="mt-4">
				<Toggle
					checked={form.default}
					onChange={(checked) => setForm((f) => ({ ...f, default: checked }))}
				/>
			</Subfield>
		</DialogContent>
	);
}

function RenamePresetDialog() {
	const { dialog, setDialog, presets } = useEditorContext();
	const dialogValue = typeof dialog === "function" ? dialog() : dialog;
	const presetIndex = dialogValue && "type" in dialogValue && dialogValue.type === "renamePreset" ? dialogValue.presetIndex : -1;
	const [name, setName] = useState(
		presets.query.data?.presets[presetIndex]?.name ?? "",
	);

	const renamePreset = useMutation({
		mutationFn: async () => presets.renamePreset(presetIndex, name),
		onSuccess: () => {
			setDialog((d) => ({ ...d, open: false }));
		},
	});

	return (
		<DialogContent
			title="Rename Preset"
			confirm={
				<Dialog.ConfirmButton
					disabled={renamePreset.isPending}
					onClick={() => renamePreset.mutate()}
				>
					Rename
				</Dialog.ConfirmButton>
			}
		>
			<Subfield name="Name" required />
			<Input
				className="mt-2"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
		</DialogContent>
	);
}

function DeletePresetDialog() {
	const { dialog, setDialog, presets } = useEditorContext();
	const dialogValue = typeof dialog === "function" ? dialog() : dialog;
	const presetIndex = dialogValue && "type" in dialogValue && dialogValue.type === "deletePreset" ? dialogValue.presetIndex : -1;

	const deletePreset = useMutation({
		mutationFn: async () => {
			await presets.deletePreset(presetIndex);
			await presets.query.refetch();
		},
		onSuccess: () => {
			setDialog((d) => ({ ...d, open: false }));
		},
	});

	return (
		<DialogContent
			title="Delete Preset"
			confirm={
				<Dialog.ConfirmButton
					variant="destructive"
					onClick={() => deletePreset.mutate()}
					disabled={deletePreset.isPending}
				>
					Delete
				</Dialog.ConfirmButton>
			}
		>
			<p className="text-gray-11">
				Are you sure you want to delete this preset?
			</p>
		</DialogContent>
	);
}

function CropDialog() {
	const { dialog, setDialog, setProject, editorInstance } = useEditorContext();
	const dialogValue = typeof dialog === "function" ? dialog() : dialog;
	const cropDialog = dialogValue && "type" in dialogValue && dialogValue.type === "crop" ? dialogValue : null;
	
	if (!cropDialog || !editorInstance) return null;
	
	const display = editorInstance.recordings.segments[0].display;
	const cropperRef = useRef<CropperRef>(null);
	const [crop, setCrop] = useState(CROP_ZERO);
	const [aspect, setAspect] = useState<Ratio | null>(null);
	const [snapToRatio, setSnapToRatioEnabled] = useState(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("editorCropSnapToRatio");
			return stored !== null ? stored === "true" : true;
		}
		return true;
	});

	useEffect(() => {
		if (snapToRatio && typeof window !== "undefined") {
			localStorage.setItem("editorCropSnapToRatio", String(snapToRatio));
		}
	}, [snapToRatio]);

	const initialBounds = {
		x: cropDialog.position.x,
		y: cropDialog.position.y,
		width: cropDialog.size.x,
		height: cropDialog.size.y,
	};

	const showCropOptionsMenu = useCallback((e: React.MouseEvent, positionAtCursor = false) => {
		e.preventDefault();
		// TODO: Replace Tauri Menu with web dropdown
		// For now, just log
		console.log("Crop options menu", { aspect, snapToRatioEnabled: snapToRatio });
	}, [aspect, snapToRatio]);

	function BoundInput(props: {
		field: keyof CropBounds;
		min?: number;
		max?: number;
	}) {
		return (
			<NumberField
				value={crop[props.field]}
				minValue={props.min}
				maxValue={props.max}
				onRawValueChange={(v) => {
					cropperRef.current?.setCropProperty(props.field, v);
				}}
				changeOnWheel={true}
				format={false}
			>
				<NumberField.Input
					className="rounded-[0.5rem] bg-gray-2 hover:ring-1 py-[18px] hover:ring-gray-5 h-[2rem] font-normal placeholder:text-black-transparent-40 text-xs caret-gray-500 transition-shadow duration-200 focus:ring-offset-1 focus:bg-gray-3 focus:ring-offset-gray-100 focus:ring-1 focus:ring-gray-10 px-[0.5rem] w-full text-[0.875rem] outline-none text-gray-12"
					onKeyDown={(e) => e.stopPropagation()}
				/>
			</NumberField>
		);
	}

	return (
		<>
			<Dialog.Header>
				<div className="flex flex-row space-x-[2rem]">
					<div className="flex flex-row items-center space-x-[0.75rem] text-gray-11">
						<span>Size</span>
						<div className="w-[3.25rem]">
							<BoundInput field="width" max={display.width} />
						</div>
						<span>×</span>
						<div className="w-[3.25rem]">
							<BoundInput field="height" max={display.height} />
						</div>
					</div>
					<div className="flex flex-row items-center space-x-[0.75rem] text-gray-11">
						<span>Position</span>
						<div className="w-[3.25rem]">
							<BoundInput field="x" />
						</div>
						<span>×</span>
						<div className="w-[3.25rem]">
							<BoundInput field="y" />
						</div>
					</div>
				</div>
				<div className="flex flex-row gap-3 justify-end items-center w-full">
					<div className="flex flex-row items-center space-x-[0.5rem] text-gray-11"></div>

					<Button
						variant="white"
						size="xs"
						className="flex items-center justify-center text-center rounded-full h-[2rem] w-[2rem] border focus:border-blue-9"
						onMouseDown={showCropOptionsMenu}
						onClick={showCropOptionsMenu}
					>
						<div className="relative pointer-events-none size-4">
							{!aspect && (
								<Maximize2 className="group-active:scale-90 transition-transform size-4 pointer-events-none *:pointer-events-none" />
							)}
							{aspect && (
								<span className="flex absolute inset-0 justify-center items-center text-xs font-medium tracking-tight leading-none pointer-events-none text text-blue-10">
									{aspect[0]}:{aspect[1]}
								</span>
							)}
						</div>
					</Button>

					<EditorButton
						leftIcon={<Maximize2 className="size-4" />}
						onClick={() => cropperRef.current?.fill()}
						disabled={
							crop.width === display.width &&
							crop.height === display.height
						}
					>
						Full
					</EditorButton>
					<EditorButton
						leftIcon={<XCircle className="size-4" />}
						onClick={() => {
							cropperRef.current?.reset();
							setAspect(null);
						}}
						disabled={
							crop.x === cropDialog.position.x &&
							crop.y === cropDialog.position.y &&
							crop.width === cropDialog.size.x &&
							crop.height === cropDialog.size.y
						}
					>
						Reset
					</EditorButton>
				</div>
			</Dialog.Header>
			<Dialog.Content>
				<div className="flex flex-row justify-center">
					<div className="rounded divide-black-transparent-10">
						<Cropper
							ref={cropperRef}
							onCropChange={setCrop}
							aspectRatio={aspect ?? undefined}
							targetSize={{ x: display.width, y: display.height }}
							initialCrop={initialBounds}
							snapToRatioEnabled={snapToRatio}
							useBackdropFilter={true}
							allowLightMode={true}
							onContextMenu={(e) => showCropOptionsMenu(e, true)}
						>
							<img
								className="shadow pointer-events-none max-h-[70vh]"
								alt="screenshot"
								src={`/api/video/${editorInstance.videoId}/screenshot`}
							/>
						</Cropper>
					</div>
				</div>
			</Dialog.Content>
			<Dialog.Footer>
				<Button
					onClick={() => {
						const bounds = crop;
						setProject((p) => ({
							...p,
							background: {
								...p.background,
								crop: {
									position: {
										x: bounds.x,
										y: bounds.y,
									},
									size: {
										x: bounds.width,
										y: bounds.height,
									},
								},
							},
						}));
						setDialog((d) => ({ ...d, open: false }));
					}}
				>
					Save
				</Button>
			</Dialog.Footer>
		</>
	);
}
