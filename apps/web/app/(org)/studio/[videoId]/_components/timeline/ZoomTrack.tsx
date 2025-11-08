"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useEditorContext } from "../context/EditorContext";
import { useTimelineContext, useTrackContext } from "./context";
import { TrackRoot, SegmentRoot, SegmentContent, SegmentHandle, useSegmentTranslateX, useSegmentWidth } from "./Track";

export type ZoomSegmentDragState =
	| { type: "idle" }
	| { type: "movePending" }
	| { type: "moving" };

const MIN_NEW_SEGMENT_PIXEL_WIDTH = 80;
const MIN_NEW_SEGMENT_SECS_WIDTH = 1;

export function ZoomTrack({
	onDragStateChanged,
	handleUpdatePlayhead,
}: {
	onDragStateChanged: (v: ZoomSegmentDragState) => void;
	handleUpdatePlayhead: (e: MouseEvent) => void;
}) {
	const {
		project,
		setProject,
		editorState,
		setEditorState,
		videoDuration,
		projectActions,
	} = useEditorContext();
	const { duration, secsPerPixel } = useTimelineContext();
	const [creatingSegmentViaDrag, setCreatingSegmentViaDrag] = useState(false);

	const newSegmentMinDuration = useMemo(() => {
		return Math.max(MIN_NEW_SEGMENT_PIXEL_WIDTH * secsPerPixel, MIN_NEW_SEGMENT_SECS_WIDTH);
	}, [secsPerPixel]);

	const newSegmentDetails = useMemo(() => {
		if (
			creatingSegmentViaDrag ||
			editorState.timeline.hoveredTrack !== "zoom" ||
			editorState.previewTime === null
		) {
			return null;
		}

		const { previewTime } = editorState;
		const zoomSegments = project.timeline.zoomSegments || [];

		const nextSegment = zoomSegments.findIndex((s) => previewTime <= s.start);
		const prevSegmentIndex = zoomSegments.findLastIndex((s) => previewTime >= s.start);

		if (prevSegmentIndex >= 0 && previewTime > zoomSegments[prevSegmentIndex].start && previewTime < zoomSegments[prevSegmentIndex].end) {
			return null;
		}

		const minDuration = newSegmentMinDuration;

		if (nextSegment >= 0) {
			if (prevSegmentIndex >= 0) {
				const availableTime = zoomSegments[nextSegment].start - zoomSegments[prevSegmentIndex].end;
				if (availableTime < minDuration) return null;
			}
			if (zoomSegments[nextSegment].start - previewTime < 1) {
				return {
					index: nextSegment,
					start: zoomSegments[nextSegment].start - minDuration,
					end: zoomSegments[nextSegment].start,
					max: zoomSegments[nextSegment].start,
				};
			}
		}

		return {
			index: nextSegment >= 0 ? nextSegment : null,
			start: previewTime,
			end: previewTime + minDuration,
			max: nextSegment >= 0 ? zoomSegments[nextSegment].start : videoDuration,
		};
	}, [creatingSegmentViaDrag, editorState.timeline.hoveredTrack, editorState.previewTime, project.timeline.zoomSegments, newSegmentMinDuration, videoDuration]);

	return (
		<TrackRoot
			onMouseEnter={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: "zoom" } }))}
			onMouseLeave={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: null } }))}
			onMouseDown={(e) => {
				if (e.button !== 0) return;
				const baseSegment = newSegmentDetails;
				if (!baseSegment) return;

				let segmentCreated = false;
				let createdSegmentIndex = -1;
				const initialMouseX = e.clientX;
				const initialEndTime = baseSegment.end;

				const createSegment = (endTime: number) => {
					if (segmentCreated) return;
					setProject((p) => {
						const zoomSegments = p.timeline.zoomSegments || [];
						let index = 0;
						for (let i = 0; i < zoomSegments.length; i++) {
							if (zoomSegments[i].start < baseSegment.start) {
								index = i + 1;
							}
						}
						const minEndTime = baseSegment.start + newSegmentMinDuration;
						const newSegments = [...zoomSegments];
						newSegments.splice(index, 0, {
							start: baseSegment.start,
							end: Math.max(minEndTime, endTime),
							zoom: 1.5,
							x: 0.5,
							y: 0.5,
						});
						createdSegmentIndex = index;
						return {
							...p,
							timeline: { ...p.timeline, zoomSegments: newSegments },
						};
					});
					segmentCreated = true;
				};

				const updateSegment = (endTime: number) => {
					if (!segmentCreated || createdSegmentIndex === -1) return;
					const minEndTime = baseSegment.start + newSegmentMinDuration;
					setProject((p) => ({
						...p,
						timeline: {
							...p.timeline,
							zoomSegments: p.timeline.zoomSegments.map((s, idx) =>
								idx === createdSegmentIndex ? { ...s, end: Math.max(minEndTime, endTime) } : s
							),
						},
					}));
				};

				const handleMouseMove = (moveEvent: MouseEvent) => {
					const deltaX = moveEvent.clientX - initialMouseX;
					const deltaTime = deltaX * secsPerPixel - (baseSegment.end - baseSegment.start);
					const newEndTime = initialEndTime + deltaTime;
					const minEndTime = baseSegment.start + newSegmentMinDuration;
					const maxEndTime = baseSegment.max;
					const clampedEndTime = Math.min(Math.max(minEndTime, newEndTime), maxEndTime);

					if (!segmentCreated) {
						setCreatingSegmentViaDrag(true);
						createSegment(clampedEndTime);
					} else {
						if (deltaTime < 0) return;
						updateSegment(clampedEndTime);
					}
				};

				const handleMouseUp = () => {
					setCreatingSegmentViaDrag(false);
					if (!segmentCreated) {
						createSegment(initialEndTime);
					}
					window.removeEventListener("mousemove", handleMouseMove);
					window.removeEventListener("mouseup", handleMouseUp);
				};

				window.addEventListener("mousemove", handleMouseMove);
				window.addEventListener("mouseup", handleMouseUp);
			}}
		>
			{project.timeline.zoomSegments.length === 0 ? (
				<div className="text-center text-sm text-gray-11 flex flex-col justify-center items-center inset-0 w-full bg-gray-3/20 dark:bg-gray-3/10 hover:bg-gray-3/30 dark:hover:bg-gray-3/20 transition-colors rounded-xl pointer-events-none">
					<div>Click to add zoom segment</div>
					<div className="text-[10px] text-gray-11/40 mt-0.5">(Smoothly zoom in on important areas)</div>
				</div>
			) : (
				project.timeline.zoomSegments.map((segment, i) => {
					const zoomPercentage = () => {
						return `${segment.zoom.toFixed(1)}x`;
					};

					const isSelected = useMemo(() => {
						const selection = editorState.timeline.selection;
						if (!selection || selection.type !== "zoom") return false;
						return selection.indices.includes(i);
					}, [editorState.timeline.selection, i]);

					const createMouseDownDrag = <T,>(
						setup: () => T,
						_update: (e: MouseEvent, v: T, initialMouseX: number) => void,
					) => {
						return (downEvent: React.MouseEvent) => {
							if (editorState.timeline.interactMode !== "normal") return;
							downEvent.stopPropagation();
							const initial = setup();
							let moved = false;
							let initialMouseX: number | null = null;
							const { setTrackState } = useTrackContext();
							setTrackState((s) => ({ ...s, draggingSegment: true }));
							onDragStateChanged({ type: "movePending" });

							const finish = (e: MouseEvent) => {
								const currentIndex = i;
								const selection = editorState.timeline.selection;
								const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
								const isMultiSelect = isMac ? e.metaKey : e.ctrlKey;
								const isRangeSelect = e.shiftKey;

								if (!moved) {
									e.stopPropagation();
									if (isRangeSelect && selection && selection.type === "zoom") {
										const existingIndices = selection.indices;
										const lastIndex = existingIndices[existingIndices.length - 1];
										const start = Math.min(lastIndex, currentIndex);
										const end = Math.max(lastIndex, currentIndex);
										const rangeIndices = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "zoom" as const, indices: rangeIndices } },
										}));
									} else if (isMultiSelect) {
										if (selection && selection.type === "zoom") {
											const baseIndices = selection.indices;
											const exists = baseIndices.includes(currentIndex);
											const newIndices = exists
												? baseIndices.filter((idx) => idx !== currentIndex)
												: [...baseIndices, currentIndex];
											setEditorState((s) => ({
												...s,
												timeline: newIndices.length > 0 ? { ...s.timeline, selection: { type: "zoom" as const, indices: newIndices } } : { ...s.timeline, selection: null },
											}));
										} else {
											setEditorState((s) => ({
												...s,
												timeline: { ...s.timeline, selection: { type: "zoom" as const, indices: [currentIndex] } },
											}));
										}
									} else {
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "zoom" as const, indices: [currentIndex] } },
										}));
									}
									handleUpdatePlayhead(e);
								}
								onDragStateChanged({ type: "idle" });
								setTrackState((s) => ({ ...s, draggingSegment: false }));
							};

							const update = (event: MouseEvent) => {
								if (Math.abs(event.clientX - downEvent.clientX) > 2) {
									if (!moved) {
										moved = true;
										initialMouseX = event.clientX;
										onDragStateChanged({ type: "moving" });
									}
								}
								if (initialMouseX === null) return;
								_update(event, initial, initialMouseX);
							};

							window.addEventListener("mousemove", update);
							window.addEventListener("mouseup", (e) => {
								update(e);
								finish(e);
								window.removeEventListener("mousemove", update);
							});
						};
					};

					return (
						<SegmentRoot
							key={i}
							className={`border duration-200 hover:border-gray-12 transition-colors group bg-gradient-to-r from-[#292929] via-[#434343] to-[#292929] shadow-[inset_0_8px_12px_3px_rgba(255,255,255,0.2)] ${
								isSelected ? "wobble-wrapper border-gray-12" : "border-transparent"
							}`}
							innerClass="ring-red-5"
							segment={segment}
							onMouseDown={(e) => {
								e.stopPropagation();
								if (editorState.timeline.interactMode === "split") {
									const rect = e.currentTarget.getBoundingClientRect();
									const fraction = (e.clientX - rect.left) / rect.width;
									const splitTime = fraction * (segment.end - segment.start);
									projectActions.splitZoomSegment(i, splitTime);
								}
							}}
						>
							<SegmentHandle
								position="start"
								onMouseDown={createMouseDownDrag(
									() => {
										const start = segment.start;
										let minValue = 0;
										const maxValue = segment.end - 1;
										const zoomSegments = project.timeline.zoomSegments || [];
										for (let j = zoomSegments.length - 1; j >= 0; j--) {
											if (zoomSegments[j].end <= start) {
												minValue = zoomSegments[j].end;
												break;
											}
										}
										return { start, minValue, maxValue };
									},
									(e, value, initialMouseX) => {
										const newStart = value.start + (e.clientX - initialMouseX) * secsPerPixel;
										setProject((p) => ({
											...p,
											timeline: {
												...p.timeline,
												zoomSegments: p.timeline.zoomSegments.map((s, idx) =>
													idx === i ? { ...s, start: Math.min(value.maxValue, Math.max(value.minValue, newStart)) } : s
												).sort((a, b) => a.start - b.start),
											},
										}));
									},
								)}
							/>
							<SegmentContent className="flex justify-center items-center cursor-grab">
								{(() => {
									const widthValue = typeof useSegmentWidth(segment, secsPerPixel) === "function"
										? (useSegmentWidth(segment, secsPerPixel) as () => number)()
										: useSegmentWidth(segment, secsPerPixel);
									if (widthValue < 40) {
										return (
											<div className="flex justify-center items-center">
												<svg className="size-3.5 text-gray-1 dark:text-gray-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
													<circle cx="11" cy="11" r="8" />
													<path d="m21 21-4.35-4.35" />
												</svg>
											</div>
										);
									}
									if (widthValue < 100) {
										return (
											<div className="flex gap-1 items-center text-xs whitespace-nowrap text-gray-1 dark:text-gray-12">
												<svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
													<circle cx="11" cy="11" r="8" />
													<path d="m21 21-4.35-4.35" />
												</svg>
												<span>{zoomPercentage()}</span>
											</div>
										);
									}
									return (
										<div className="flex flex-col gap-1 justify-center items-center text-xs whitespace-nowrap text-gray-1 dark:text-gray-12 animate-in fade-in">
											<span className="opacity-70">Zoom</span>
											<div className="flex gap-1 items-center text-md">
												<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
													<circle cx="11" cy="11" r="8" />
													<path d="m21 21-4.35-4.35" />
												</svg>
												{zoomPercentage()}
											</div>
										</div>
									);
								})()}
							</SegmentContent>
							<SegmentHandle
								position="end"
								onMouseDown={createMouseDownDrag(
									() => {
										const end = segment.end;
										const minValue = segment.start + 1;
										let maxValue = duration;
										const zoomSegments = project.timeline.zoomSegments || [];
										for (let j = 0; j < zoomSegments.length; j++) {
											if (zoomSegments[j].start > end) {
												maxValue = zoomSegments[j].start;
												break;
											}
										}
										return { end, minValue, maxValue };
									},
									(e, value, initialMouseX) => {
										const newEnd = value.end + (e.clientX - initialMouseX) * secsPerPixel;
										setProject((p) => ({
											...p,
											timeline: {
												...p.timeline,
												zoomSegments: p.timeline.zoomSegments.map((s, idx) =>
													idx === i ? { ...s, end: Math.min(value.maxValue, Math.max(value.minValue, newEnd)) } : s
												).sort((a, b) => a.start - b.start),
											},
										}));
									},
								)}
							/>
						</SegmentRoot>
					);
				})
			)}
			{newSegmentDetails && (
				<SegmentRoot
					className="pointer-events-none"
					innerClass="ring-red-300"
					segment={newSegmentDetails}
				>
					<SegmentContent className="bg-gradient-to-r hover:border duration-200 hover:border-gray-500 from-[#292929] via-[#434343] to-[#292929] transition-colors group shadow-[inset_0_8px_12px_3px_rgba(255,255,255,0.2)]">
						<p className="w-full text-center text-gray-1 dark:text-gray-12 text-md text-primary">+</p>
					</SegmentContent>
				</SegmentRoot>
			)}
		</TrackRoot>
	);
}

