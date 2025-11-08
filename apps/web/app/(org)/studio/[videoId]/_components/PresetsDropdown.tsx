"use client";

import { DropdownMenu as KDropdownMenu } from "~/components/kobalte-compat";
import { cx } from "cva";
import { useState, Suspense } from "react";
import { useEditorContext } from "./context/EditorContext";
import {
	DropdownItem,
	dropdownContainerClasses,
	EditorButton,
	MenuItem,
	MenuItemList,
	PopperContent,
	topCenterAnimateClasses,
} from "./ui";
import { Sliders, ChevronDown, Settings, PlusCircle } from "lucide-react";

export default function PresetsDropdown() {
	const { setDialog, presets, setProject, project } = useEditorContext();
	const presetsList = presets.query.data?.presets ?? [];

	return (
		<KDropdownMenu gutter={8} placement="bottom">
			<EditorButton
				as={KDropdownMenu.Trigger}
				leftIcon={<Sliders className="size-4" />}
				rightIcon={<ChevronDown className="size-4" />}
			>
				Presets
			</EditorButton>
			<KDropdownMenu.Portal>
				<Suspense fallback={<div className="py-1 w-full text-sm text-center text-gray-11">Loading...</div>}>
					<PopperContent
						as={KDropdownMenu.Content}
						className={cx("w-72 max-h-56", topCenterAnimateClasses)}
					>
						<MenuItemList
							as={KDropdownMenu.Group}
							className="overflow-y-auto flex-1 scrollbar-none"
						>
							{presetsList.length === 0 ? (
								<div className="py-1 w-full text-sm text-center text-gray-11">
									No Presets
								</div>
							) : (
								presetsList.map((preset, i) => (
									<PresetItem
										key={preset.id || i}
										preset={preset}
										index={i}
										isDefault={presets.query.data?.default === i}
										setProject={setProject}
										project={project}
										setDialog={setDialog}
										presets={presets}
									/>
								))
							)}
						</MenuItemList>
						<MenuItemList
							as={KDropdownMenu.Group}
							className="border-t shrink-0"
						>
							<DropdownItem
								onSelect={() => setDialog({ type: "createPreset", open: true })}
							>
								<span>Create new preset</span>
								<PlusCircle className="ml-auto size-4" />
							</DropdownItem>
						</MenuItemList>
					</PopperContent>
				</Suspense>
			</KDropdownMenu.Portal>
		</KDropdownMenu>
	);
}

function PresetItem({
	preset,
	index,
	isDefault,
	setProject,
	project,
	setDialog,
	presets,
}: {
	preset: { id?: string; name: string; config: any };
	index: number;
	isDefault: boolean;
	setProject: (updater: any) => void;
	project: any;
	setDialog: (dialog: any) => void;
	presets: any;
}) {
	const [showSettings, setShowSettings] = useState(false);

	const applyPreset = () => {
		setShowSettings(false);
		setProject({
			...preset.config,
			timeline: project.timeline,
		});
	};

	return (
		<KDropdownMenu.Sub gutter={16}>
			<MenuItem
				as={KDropdownMenu.SubTrigger}
				className="h-[2.5rem]"
				onFocusIn={() => setShowSettings(false)}
				onClick={() => {
					applyPreset();
				}}
			>
				<span className="mr-auto">{preset.name}</span>
				{isDefault && (
					<span className="px-2 py-1 text-[11px] rounded-full bg-gray-2 text-gray-11">
						Default
					</span>
				)}
				<button
					type="button"
					className="text-gray-11 hover:text-[currentColor]"
					onClick={(e) => {
						e.stopPropagation();
						setShowSettings((s) => !s);
					}}
					onPointerUp={(e) => {
						e.stopPropagation();
						e.preventDefault();
					}}
				>
					<Settings className="size-4" />
				</button>
			</MenuItem>
			<KDropdownMenu.Portal>
				{showSettings && (
					<MenuItemList
						as={KDropdownMenu.SubContent}
						className={cx(
							"w-44 animate-in fade-in slide-in-from-left-1",
							dropdownContainerClasses,
						)}
					>
						<DropdownItem
							onSelect={() => {
								applyPreset();
							}}
						>
							Apply
						</DropdownItem>
						<DropdownItem
							onSelect={() => presets.setDefault(index)}
						>
							Set as default
						</DropdownItem>
						<DropdownItem
							onSelect={() =>
								setDialog({
									type: "renamePreset",
									presetIndex: index,
									open: true,
								})
							}
						>
							Rename
						</DropdownItem>
						<DropdownItem
							onClick={() =>
								setDialog({
									type: "deletePreset",
									presetIndex: index,
									open: true,
								})
							}
						>
							Delete
						</DropdownItem>
					</MenuItemList>
				)}
			</KDropdownMenu.Portal>
		</KDropdownMenu.Sub>
	);
}
