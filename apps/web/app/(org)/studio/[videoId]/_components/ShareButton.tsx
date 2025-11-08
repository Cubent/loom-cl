"use client";

import { Button } from "./ui";
import { Select as KSelect } from "~/components/kobalte-compat";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Tooltip from "~/components/Tooltip";
import { useEditorContext } from "./context/EditorContext";
import { RESOLUTION_OPTIONS } from "./EditorHeader";
import {
	Dialog,
	DialogContent,
	MenuItem,
	MenuItemList,
	PopperContent,
	topLeftAnimateClasses,
} from "./ui";
import { LoaderCircle, RotateCcw, ChevronDown, Copy, Check } from "lucide-react";

type UploadState =
	| { type: "idle" }
	| { type: "starting" }
	| { type: "rendering"; renderedFrames: number; totalFrames: number }
	| { type: "uploading"; progress: number }
	| { type: "link-copied" };

export default function ShareButton() {
	const { videoData, customDomain, editorState, setEditorState } = useEditorContext();
	const [uploadState, setUploadState] = useState<UploadState>({ type: "idle" });

	const upload = useMutation({
		mutationFn: async () => {
			setUploadState({ type: "idle" });

			console.log("Starting upload process...");

			// TODO: Implement web-based video export and upload
			// For now, this is a placeholder
			setUploadState({ type: "starting" });
			
			// Simulate rendering
			setUploadState({ type: "rendering", renderedFrames: 0, totalFrames: 100 });
			
			// Simulate upload
			setUploadState({ type: "uploading", progress: 0 });
			
			// Simulate completion
			setUploadState({ type: "link-copied" });

			return { success: true };
		},
		onError: (error) => {
			console.error(error);
			alert(error instanceof Error ? error.message : "Failed to upload recording");
		},
		onSettled: () => {
			setTimeout(() => {
				setUploadState({ type: "idle" });
				upload.reset();
			}, 2000);
		},
	});

	if (!videoData?.sharing) {
		return null;
	}

	const sharing = videoData.sharing;
	const normalUrl = new URL(sharing.link);
	const customUrl =
		customDomain.data?.custom_domain && customDomain.data?.domain_verified
			? new URL(customDomain.data.custom_domain + `/s/${sharing.id}`)
			: null;

	const normalLink = `${normalUrl.host}${normalUrl.pathname}`;
	const customLink = customUrl ? `${customUrl.host}${customUrl.pathname}` : null;

	const copyLinks = {
		normal: sharing.link,
		custom: customUrl?.href,
	};

	const [linkToDisplay, setLinkToDisplay] = useState<string | null>(
		customDomain.data?.custom_domain && customDomain.data?.domain_verified
			? customLink!
			: normalLink,
	);

	const [copyPressed, setCopyPressed] = useState(false);

	const copyLink = () => {
		navigator.clipboard.writeText(linkToDisplay || sharing.link);
		setCopyPressed(true);
		setTimeout(() => {
			setCopyPressed(false);
		}, 2000);
	};

	return (
		<div className="relative">
			<div className="flex gap-3 items-center">
				<Tooltip
					content={upload.isPending ? "Reuploading video" : "Reupload video"}
				>
					<Button
						disabled={upload.isPending}
						onClick={() => {
							if (editorState.timeline.selection) {
								setEditorState((prev) => ({
									...prev,
									timeline: {
										...prev.timeline,
										selection: null,
									},
								}));
								return;
							}
							upload.mutate();
						}}
						variant="dark"
						className="flex justify-center items-center size-[41px] !px-0 !py-0 space-x-1"
					>
						{upload.isPending ? (
							<LoaderCircle className="animate-spin size-4" />
						) : (
							<RotateCcw className="size-4" />
						)}
					</Button>
				</Tooltip>
				<Tooltip content="Open link">
					<div className="rounded-xl px-3 py-2 flex flex-row items-center gap-[0.375rem] bg-gray-3 hover:bg-gray-4 transition-colors duration-100">
						<a
							href={
								linkToDisplay === customLink
									? copyLinks.custom
									: copyLinks.normal
							}
							target="_blank"
							rel="noreferrer"
							className="w-full truncate max-w-[200px]"
						>
							<span className="text-xs text-gray-12">{linkToDisplay}</span>
						</a>
						{customDomain.data?.custom_domain && customDomain.data?.domain_verified && (
							<Tooltip content="Select link">
								<KSelect
									value={linkToDisplay}
									onChange={(value) => value && setLinkToDisplay(value)}
									options={[customLink!, normalLink].filter(
										(link) => link !== linkToDisplay,
									)}
									multiple={false}
									itemComponent={(props) => (
										<MenuItem
											as={KSelect.Item}
											item={props.item}
										>
											<KSelect.ItemLabel className="flex-1 text-xs truncate">
												{props.item.rawValue}
											</KSelect.ItemLabel>
										</MenuItem>
									)}
									placement="bottom-end"
									gutter={4}
								>
									<KSelect.Trigger className="flex justify-center items-center transition-colors duration-200 rounded-lg size-[22px] text-gray-12 bg-gray-6 hover:bg-gray-7 group focus:outline-none focus-visible:outline-none">
										<KSelect.Icon>
											<ChevronDown className="size-4 transition-transform duration-200 group-data-[expanded]:rotate-180" />
										</KSelect.Icon>
									</KSelect.Trigger>
									<KSelect.Portal>
										<PopperContent
											as={KSelect.Content}
											className={topLeftAnimateClasses}
										>
											<MenuItemList
												as={KSelect.Listbox}
												className="w-[236px]"
											/>
										</PopperContent>
									</KSelect.Portal>
								</KSelect>
							</Tooltip>
						)}
						<Tooltip content="Copy link">
							<div
								className="flex justify-center items-center transition-colors duration-200 rounded-lg size-[22px] text-gray-12 bg-gray-6 hover:bg-gray-7 cursor-pointer"
								onClick={copyLink}
							>
								{!copyPressed ? (
									<Copy className="size-3" />
								) : (
									<Check className="size-3 svgpathanimation" />
								)}
							</div>
						</Tooltip>
					</div>
				</Tooltip>
			</div>
			<Dialog.Root open={uploadState.type !== "idle"}>
				<DialogContent
					title={"Reupload Recording"}
					confirm={<></>}
					close={<></>}
					className="text-gray-12 dark:text-gray-12"
				>
					<div className="w-[80%] text-center mx-auto relative z-10 space-y-6 py-4">
						<div className="w-full bg-gray-3 rounded-full h-2.5 mb-2">
							<div
								className="bg-blue-9 h-2.5 rounded-full"
								style={{
									width: `${
										uploadState.type === "uploading"
											? uploadState.progress
											: uploadState.type === "link-copied"
												? 100
												: uploadState.type === "rendering"
													? Math.min(
															(uploadState.renderedFrames /
																uploadState.totalFrames) *
																100,
															100,
														)
													: 0
									}%`,
								}}
							/>
						</div>

						<p className="relative z-10 mt-3 text-xs text-white">
							{uploadState.type === "idle" || uploadState.type === "starting"
								? "Preparing to render..."
								: uploadState.type === "rendering"
									? `Rendering video (${uploadState.renderedFrames}/${uploadState.totalFrames} frames)`
									: uploadState.type === "uploading"
										? `Uploading - ${Math.floor(uploadState.progress)}%`
										: "Link copied to clipboard!"}
						</p>
					</div>
				</DialogContent>
			</Dialog.Root>
		</div>
	);
}
