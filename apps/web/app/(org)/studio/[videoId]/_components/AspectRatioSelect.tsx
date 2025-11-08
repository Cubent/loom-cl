"use client";

import { Select as KSelect } from "~/components/kobalte-compat";
import { useState, useRef } from "react";
import Tooltip from "~/components/Tooltip";
import type { AspectRatio } from "../types";
import { useEditorContext } from "./context/EditorContext";
import { ASPECT_RATIOS } from "./projectConfig";
import {
	EditorButton,
	MenuItem,
	MenuItemList,
	PopperContent,
	topLeftAnimateClasses,
} from "./ui";
import { Maximize2, ChevronDown, CheckCircle2 } from "lucide-react";

export default function AspectRatioSelect() {
	const { project, setProject } = useEditorContext();
	const [open, setOpen] = useState(false);
	const triggerSelectRef = useRef<HTMLDivElement>(null);

	return (
		<Tooltip content="Aspect Ratio">
			<KSelect<AspectRatio | "auto">
				open={open}
				onOpenChange={setOpen}
				ref={triggerSelectRef}
				value={project.aspectRatio ?? "auto"}
				onChange={(v) => {
					if (v === null) return;
					setProject((prev) => ({
						...prev,
						aspectRatio: v === "auto" ? null : v,
					}));
				}}
				defaultValue="auto"
				options={["auto", "wide", "vertical", "square", "classic", "tall"] as const}
				multiple={false}
				itemComponent={(props) => {
					const item =
						props.item.rawValue === "auto" ? null : ASPECT_RATIOS[props.item.rawValue];

					return (
						<MenuItem<typeof KSelect.Item> as={KSelect.Item} item={props.item}>
							<KSelect.ItemLabel className="flex-1">
								{props.item.rawValue === "auto"
									? "Auto"
									: ASPECT_RATIOS[props.item.rawValue].name}
								{item && (
									<span className="text-gray-11">
										{"⋅"}
										{item.ratio[0]}:{item.ratio[1]}
									</span>
								)}
							</KSelect.ItemLabel>
							<KSelect.ItemIndicator className="ml-auto">
								<CheckCircle2 className="size-4" />
							</KSelect.ItemIndicator>
						</MenuItem>
					);
				}}
				placement="top-start"
			>
				<EditorButton
					as={KSelect.Trigger}
					className="w-28"
					leftIcon={<Maximize2 className="size-4" />}
					rightIcon={
						<KSelect.Icon>
							<ChevronDown className="size-4" />
						</KSelect.Icon>
					}
					rightIconEnd={true}
				>
					<KSelect.Value<AspectRatio | "auto">>
						{(state) => {
							const option = state.selectedOption();
							const text = option === "auto" ? "Auto" : ASPECT_RATIOS[option].name;
							return <>{text}</>;
						}}
					</KSelect.Value>
				</EditorButton>
				<KSelect.Portal>
					<PopperContent
						as={KSelect.Content}
						className={topLeftAnimateClasses}
					>
						<MenuItemList
							as={KSelect.Listbox}
							className="w-[12.5rem]"
						/>
					</PopperContent>
				</KSelect.Portal>
			</KSelect>
		</Tooltip>
	);
}
