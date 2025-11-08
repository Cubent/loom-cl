"use client";

import { useState, useMemo, useEffect } from "react";
import { useEditorContext } from "../context/EditorContext";
import { useTimelineContext, useTrackContext } from "./context";
import { TrackRoot, SegmentRoot, SegmentContent, SegmentHandle, useSegmentTranslateX, useSegmentWidth } from "./Track";

export type SceneSegmentDragState =
	| { type: "idle" }
	| { type: "movePending" }
	| { type: "moving" };

export function SceneTrack({
	onDragStateChanged,
	handleUpdatePlayhead,
}: {
	onDragStateChanged: (v: SceneSegmentDragState) => void;
	handleUpdatePlayhead: (e: MouseEvent) => void;
}) {
	const {
		project,
		setProject,
		editorState,
		setEditorState,
		projectActions,
	} = useEditorContext();
	const { duration, secsPerPixel } = useTimelineContext();
	const [hoveringSegment, setHoveringSegment] = useState(false);
	const [hoveredTime, setHoveredTime] = useState<number | undefined>();
	const [maxAvailableDuration, setMaxAvailableDuration] = useState(3);

	useEffect(() => {
		const segments = project.timeline.sceneSegments;
		if (!segments || segments.length === 0) {
			setHoveringSegment(false);
		}
	}, [project.timeline.sceneSegments]);

	const getSceneIcon = (mode: string | undefined) => {
		switch (mode) {
			case "cameraOnly":
				return (
					<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
						<line x1="1" y1="1" x2="23" y2="23" />
					</svg>
				);
			case "hideCamera":
				return (
					<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
						<line x1="1" y1="1" x2="23" y2="23" />
					</svg>
				);
			default:
				return (
					<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
						<line x1="8" y1="21" x2="16" y2="21" />
						<line x1="12" y1="17" x2="12" y2="21" />
					</svg>
				);
		}
	};

	const getSceneLabel = (mode: string | undefined) => {
		switch (mode) {
			case "cameraOnly":
				return "Camera Only";
			case "hideCamera":
				return "Hide Camera";
			default:
				return "Default";
		}
	};

	const TrackContextWrapper = ({ 
		hoveredTime: hTime, 
		maxAvailableDuration: maxDur 
	}: { 
		hoveredTime: number | undefined;
		maxAvailableDuration: number;
	}) => {
		const trackContext = useTrackContext();
		return (
			<>
				{!trackContext.trackState.draggingSegment && hTime !== undefined && (
					<SegmentRoot
						className="pointer-events-none"
						innerClass="ring-blue-300"
						segment={{
							start: hTime,
							end: hTime + maxDur,
						}}
					>
						<SegmentContent className="bg-gradient-to-r hover:border duration-200 hover:border-gray-500 from-[#5C1BC4] via-[#975CFA] to-[#5C1BC4] transition-colors group shadow-[inset_0_8px_12px_3px_rgba(255,255,255,0.2)]">
							<p className="w-full text-center text-gray-1 dark:text-gray-12 text-md text-primary">+</p>
						</SegmentContent>
					</SegmentRoot>
				)}
			</>
		);
	};

	return (
		<TrackRoot
			onMouseEnter={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: "scene" } }))}
			onMouseMove={(e) => {
				if (hoveringSegment) {
					setHoveredTime(undefined);
					return;
				}

				const bounds = (e.target as HTMLElement).getBoundingClientRect();
				let time = (e.clientX - bounds.left) * secsPerPixel + editorState.timeline.transform.position;

				const segments = project.timeline.sceneSegments || [];
				const nextSegmentIndex = segments.findIndex((s) => time < s.start);

				let maxDuration = 3;

				if (nextSegmentIndex !== -1) {
					const nextSegment = segments[nextSegmentIndex];
					const prevSegmentIndex = nextSegmentIndex - 1;

					if (prevSegmentIndex >= 0) {
						const prevSegment = segments[prevSegmentIndex];
						const gapStart = prevSegment.end;
						const gapEnd = nextSegment.start;
						const availableSpace = gapEnd - gapStart;

						if (availableSpace < 0.5) {
							setHoveredTime(undefined);
							return;
						}

						if (time < gapStart) {
							time = gapStart;
						}

						maxDuration = Math.min(3, gapEnd - time);
					} else {
						maxDuration = Math.min(3, nextSegment.start - time);
					}

					if (nextSegment.start - time < 0.5) {
						setHoveredTime(undefined);
						return;
					}
				} else if (segments.length > 0) {
					const lastSegment = segments[segments.length - 1];
					if (time < lastSegment.end) {
						time = lastSegment.end;
					}
					maxDuration = Math.min(3, duration - time);
				} else {
					maxDuration = Math.min(3, duration - time);
				}

				if (maxDuration < 0.5) {
					setHoveredTime(undefined);
					return;
				}

				setMaxAvailableDuration(maxDuration);
				setHoveredTime(Math.min(time, duration - maxDuration));
			}}
			onMouseLeave={() => {
				setHoveredTime(undefined);
				setMaxAvailableDuration(3);
				setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: null } }));
			}}
			onMouseDown={(e) => {
				const handleMouseUp = (upEvent: MouseEvent) => {
					const time = hoveredTime;
					const maxDuration = maxAvailableDuration;
					if (time === undefined) return;

					upEvent.stopPropagation();
					setProject((p) => {
						const sceneSegments = p.timeline.sceneSegments || [];
						let index = sceneSegments.length;

						for (let i = sceneSegments.length - 1; i >= 0; i--) {
							if (sceneSegments[i].start > time) {
								index = i;
								break;
							}
						}

						const newSegments = [...sceneSegments];
						newSegments.splice(index, 0, {
							start: time,
							end: time + maxDuration,
							position: { x: 0, y: 0 },
							size: { x: 320, y: 180 },
						});

						return {
							...p,
							timeline: { ...p.timeline, sceneSegments: newSegments },
						};
					});
					window.removeEventListener("mouseup", handleMouseUp);
				};
				window.addEventListener("mouseup", handleMouseUp);
			}}
		>
			{project.timeline.sceneSegments.length === 0 ? (
				<div className="text-center text-sm text-gray-11 flex flex-col justify-center items-center inset-0 w-full bg-gray-3/20 dark:bg-gray-3/10 hover:bg-gray-3/30 dark:hover:bg-gray-3/20 transition-colors rounded-xl pointer-events-none">
					<div>Click to add scene segment</div>
					<div className="text-[10px] text-gray-11/40 mt-0.5">(Make the camera full screen, or hide it)</div>
				</div>
			) : (
				project.timeline.sceneSegments.map((segment, i) => {
					const sceneSegments = project.timeline.sceneSegments || [];

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
									if (isRangeSelect && selection && selection.type === "scene") {
										const existingIndices = selection.indices;
										const lastIndex = existingIndices[existingIndices.length - 1];
										const start = Math.min(lastIndex, currentIndex);
										const end = Math.max(lastIndex, currentIndex);
										const rangeIndices = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "scene" as const, indices: rangeIndices } },
										}));
									} else if (isMultiSelect) {
										if (selection && selection.type === "scene") {
											const baseIndices = selection.indices;
											const exists = baseIndices.includes(currentIndex);
											const newIndices = exists
												? baseIndices.filter((idx) => idx !== currentIndex)
												: [...baseIndices, currentIndex];
											setEditorState((s) => ({
												...s,
												timeline: newIndices.length > 0 ? { ...s.timeline, selection: { type: "scene" as const, indices: newIndices } } : { ...s.timeline, selection: null },
											}));
										} else {
											setEditorState((s) => ({
												...s,
												timeline: { ...s.timeline, selection: { type: "scene" as const, indices: [currentIndex] } },
											}));
										}
									} else {
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "scene" as const, indices: [currentIndex] } },
										}));
									}
									handleUpdatePlayhead(e);
								} else {
									setEditorState((s) => ({
										...s,
										timeline: { ...s.timeline, selection: { type: "scene" as const, indices: [currentIndex] } },
									}));
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

					const isSelected = useMemo(() => {
						const selection = editorState.timeline.selection;
						if (!selection || selection.type !== "scene") return false;
						return selection.indices.includes(i);
					}, [editorState.timeline.selection, i]);

					return (
						<SegmentRoot
							key={i}
							className={`border transition-colors duration-200 hover:border-gray-12 group bg-gradient-to-r from-[#5C1BC4] via-[#975CFA] to-[#5C1BC4] shadow-[inset_0_8px_12px_3px_rgba(255,255,255,0.2)] ${
								isSelected ? "wobble-wrapper border-gray-12" : "border-transparent"
							}`}
							innerClass="ring-blue-5"
							segment={segment}
							onMouseEnter={() => setHoveringSegment(true)}
							onMouseLeave={() => setHoveringSegment(false)}
							onMouseDown={(e) => {
								e.stopPropagation();
								if (editorState.timeline.interactMode === "split") {
									const rect = e.currentTarget.getBoundingClientRect();
									const fraction = (e.clientX - rect.left) / rect.width;
									const splitTime = fraction * (segment.end - segment.start);
									projectActions.splitSceneSegment(i, splitTime);
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
										for (let j = sceneSegments.length - 1; j >= 0; j--) {
											if (sceneSegments[j].end <= start) {
												minValue = sceneSegments[j].end;
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
												sceneSegments: p.timeline.sceneSegments.map((s, idx) =>
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
									if (widthValue > 80) {
										return (
											<div className="flex flex-col gap-1 justify-center items-center text-xs whitespace-nowrap text-gray-1 dark:text-gray-12 animate-in fade-in">
												<span className="opacity-70">Scene</span>
												<div className="flex gap-1 items-center text-md">
													{getSceneIcon(undefined)}
													{widthValue > 120 && <span className="text-xs">{getSceneLabel(undefined)}</span>}
												</div>
											</div>
										);
									}
									return null;
								})()}
							</SegmentContent>
							<SegmentHandle
								position="end"
								onMouseDown={createMouseDownDrag(
									() => {
										const end = segment.end;
										const minValue = segment.start + 1;
										let maxValue = duration;
										for (let j = 0; j < sceneSegments.length; j++) {
											if (sceneSegments[j].start > end) {
												maxValue = sceneSegments[j].start;
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
												sceneSegments: p.timeline.sceneSegments.map((s, idx) =>
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
			<TrackContextWrapper hoveredTime={hoveredTime} maxAvailableDuration={maxAvailableDuration} />
		</TrackRoot>
	);
}

