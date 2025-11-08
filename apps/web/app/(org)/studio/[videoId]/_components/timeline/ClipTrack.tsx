"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useEditorContext } from "../context/EditorContext";
import { useTimelineContext, useSegmentContext, useTrackContext } from "./context";
import { TrackRoot, SegmentRoot, SegmentContent, SegmentHandle, useSegmentTranslateX, useSegmentWidth } from "./Track";

function formatTime(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	} else {
		return `${seconds}s`;
	}
}

function WaveformCanvas({
	systemWaveform,
	micWaveform,
	segment,
	secsPerPixel,
}: {
	systemWaveform?: number[];
	micWaveform?: number[];
	segment: { start: number; end: number };
	secsPerPixel: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { width } = useSegmentContext();
	const { project } = useEditorContext();

	const render = useCallback((
		ctx: CanvasRenderingContext2D,
		h: number,
		waveform: number[],
		color: string,
		gain = 0,
	) => {
		const maxAmplitude = h;
		ctx.fillStyle = color;
		ctx.beginPath();
		const step = 0.05 / secsPerPixel;
		ctx.moveTo(0, h);

		const norm = (w: number) => {
			const ww = Number.isFinite(w) ? w : -60;
			return 1.0 - Math.max(ww + gain, -60) / -60;
		};

		for (
			let segmentTime = segment.start;
			segmentTime <= segment.end + 0.1;
			segmentTime += 0.1
		) {
			const index = Math.floor(segmentTime * 10);
			const xTime = index / 10;
			const currentDb = typeof waveform[index] === "number" ? waveform[index] : -60;
			const amplitude = norm(currentDb) * maxAmplitude;
			const x = (xTime - segment.start) / secsPerPixel;
			const y = h - amplitude;
			const prevX = (xTime - 0.1 - segment.start) / secsPerPixel;
			const prevDb = typeof waveform[index - 1] === "number" ? waveform[index - 1] : -60;
			const prevAmplitude = norm(prevDb) * maxAmplitude;
			const prevY = h - prevAmplitude;
			const cpX1 = prevX + step / 2;
			const cpX2 = x - step / 2;
			ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
		}

		ctx.lineTo((segment.end + 0.3 - segment.start) / secsPerPixel, h);
		ctx.closePath();
		ctx.fill();
	}, [segment, secsPerPixel]);

	const renderWaveforms = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = typeof width === "function" ? width() : width;
		if (w <= 0) return;

		const h = canvas.height;
		canvas.width = w;
		ctx.clearRect(0, 0, w, h);

		if (micWaveform) {
			render(ctx, h, micWaveform, "rgba(255,255,255,0.4)", 0);
		}

		if (systemWaveform) {
			render(ctx, h, systemWaveform, "rgba(255,150,0,0.5)", 0);
		}
	}, [width, micWaveform, systemWaveform, render]);

	useEffect(() => {
		renderWaveforms();
	}, [renderWaveforms]);

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 w-full h-full pointer-events-none"
			height={52}
		/>
	);
}

export function ClipTrack({
	handleUpdatePlayhead,
	ref: refProp,
}: {
	handleUpdatePlayhead: (e: MouseEvent) => void;
	ref?: React.Ref<HTMLDivElement>;
}) {
	const {
		project,
		setProject,
		editorState,
		setEditorState,
		projectActions,
		videoDuration,
	} = useEditorContext();
	const { secsPerPixel, duration } = useTimelineContext();

	const segments = useMemo(() => {
		return project.timeline.segments.length > 0
			? project.timeline.segments
			: [{ start: 0, end: duration, timescale: 1 }];
	}, [project.timeline.segments, duration]);

	const split = editorState.timeline.interactMode === "split";

	return (
		<TrackRoot
			ref={refProp}
			onMouseEnter={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: "clip" } }))}
			onMouseLeave={() => setEditorState((s) => ({ ...s, timeline: { ...s.timeline, hoveredTrack: null } }))}
		>
			{segments.map((segment, i) => {
				const [startHandleDrag, setStartHandleDrag] = useState<{
					offset: number;
					initialStart: number;
				} | null>(null);

				const prefixOffsets = useMemo(() => {
					const out: number[] = new Array(segments.length);
					let sum = 0;
					for (let k = 0; k < segments.length; k++) {
						out[k] = sum;
						sum += (segments[k].end - segments[k].start) / segments[k].timescale;
					}
					return out;
				}, [segments]);

				const prevDuration = prefixOffsets[i] ?? 0;

				const relativeSegment = useMemo(() => {
					const ds = startHandleDrag;
					const offset = ds?.offset ?? 0;
					return {
						start: Math.max(prevDuration + offset, 0),
						end: prevDuration + (offset + (segment.end - segment.start)) / segment.timescale,
						timescale: segment.timescale,
						recordingSegment: segment.recordingSegment,
					};
				}, [startHandleDrag, prevDuration, segment]);

				const translateX = useSegmentTranslateX(relativeSegment, editorState.timeline.transform, secsPerPixel);
				const segmentWidth = useSegmentWidth(relativeSegment, secsPerPixel);

				const isSelected = useMemo(() => {
					const selection = editorState.timeline.selection;
					if (!selection || selection.type !== "clip") return false;
					return selection.indices.includes(i);
				}, [editorState.timeline.selection, i]);

				return (
					<SegmentRoot
						key={i}
						className={`border transition-colors duration-200 group hover:border-gray-12 bg-gradient-to-r from-[#2675DB] via-[#4FA0FF] to-[#2675DB] shadow-[inset_0_5px_10px_5px_rgba(255,255,255,0.2)] ${
							isSelected ? "wobble-wrapper border-gray-12" : "border-transparent"
						}`}
						innerClass="ring-blue-9"
						segment={relativeSegment}
						onMouseDown={(e) => {
							e.stopPropagation();
							if (split) {
								const rect = e.currentTarget.getBoundingClientRect();
								const fraction = (e.clientX - rect.left) / rect.width;
								const splitTime = fraction * (segment.end - segment.start);
								projectActions.splitClipSegment(prevDuration + splitTime);
							} else {
								// Handle selection and dragging
								const handleMouseUp = (upEvent: MouseEvent) => {
									const currentIndex = i;
									const selection = editorState.timeline.selection;
									const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
									const isMultiSelect = isMac ? upEvent.metaKey : upEvent.ctrlKey;
									const isRangeSelect = upEvent.shiftKey;

									if (isRangeSelect && selection && selection.type === "clip") {
										const existingIndices = selection.indices;
										const lastIndex = existingIndices[existingIndices.length - 1];
										const start = Math.min(lastIndex, currentIndex);
										const end = Math.max(lastIndex, currentIndex);
										const rangeIndices = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "clip" as const, indices: rangeIndices } },
										}));
									} else if (isMultiSelect && selection && selection.type === "clip") {
										const existingIndices = selection.indices;
										if (existingIndices.includes(currentIndex)) {
											const newIndices = existingIndices.filter((idx) => idx !== currentIndex);
											setEditorState((s) => ({
												...s,
												timeline: newIndices.length > 0 ? { ...s.timeline, selection: { type: "clip" as const, indices: newIndices } } : { ...s.timeline, selection: null },
											}));
										} else {
											setEditorState((s) => ({
												...s,
												timeline: { ...s.timeline, selection: { type: "clip" as const, indices: [...existingIndices, currentIndex] } },
											}));
										}
									} else {
										setEditorState((s) => ({
											...s,
											timeline: { ...s.timeline, selection: { type: "clip" as const, indices: [currentIndex] } },
										}));
									}
									handleUpdatePlayhead(upEvent);
									window.removeEventListener("mouseup", handleMouseUp);
								};
								window.addEventListener("mouseup", handleMouseUp);
							}
						}}
					>
						{segment.timescale === 1 && (
							<WaveformCanvas
								micWaveform={undefined}
								systemWaveform={undefined}
								segment={segment}
								secsPerPixel={secsPerPixel}
							/>
						)}
						<SegmentContent className="relative justify-center items-center">
							{(() => {
								const widthValue = typeof segmentWidth === "function" ? segmentWidth() : segmentWidth;
								if (widthValue > 100) {
									return (
										<div className="flex flex-col gap-1 justify-center items-center text-xs whitespace-nowrap text-gray-12">
											<span className="text-white/70">Clip</span>
											<div className="flex gap-1 items-center text-md dark:text-gray-12 text-gray-1">
												{formatTime(segment.end - segment.start)}
												{segment.timescale !== 1 && (
													<>
														<div className="w-0.5" />
														{segment.timescale}x
													</>
												)}
											</div>
										</div>
									);
								}
								return null;
							})()}
						</SegmentContent>
						<SegmentHandle
							position="start"
							className="opacity-0 group-hover:opacity-100"
							onMouseDown={(downEvent) => {
								if (split) return;
								const initialStart = segment.start;
								setStartHandleDrag({ offset: 0, initialStart });

								const update = (event: MouseEvent) => {
									const newStart = initialStart + (event.clientX - downEvent.clientX) * secsPerPixel * segment.timescale;
									const clampedStart = Math.min(Math.max(newStart, 0), segment.end - 1);
									setStartHandleDrag({ offset: clampedStart - initialStart, initialStart });
									setProject((p) => ({
										...p,
										timeline: {
											...p.timeline,
											segments: p.timeline.segments.map((s, idx) => (idx === i ? { ...s, start: clampedStart } : s)),
										},
									}));
								};

								const handleMouseUp = () => {
									setStartHandleDrag(null);
									window.removeEventListener("mousemove", update);
									window.removeEventListener("mouseup", handleMouseUp);
								};

								window.addEventListener("mousemove", update);
								window.addEventListener("mouseup", handleMouseUp);
							}}
						/>
						<SegmentHandle
							position="end"
							className="opacity-0 group-hover:opacity-100"
							onMouseDown={(downEvent) => {
								if (split) return;
								const end = segment.end;

								const update = (event: MouseEvent) => {
									const deltaRecorded = (event.clientX - downEvent.clientX) * secsPerPixel * segment.timescale;
									const newEnd = end + deltaRecorded;
									setProject((p) => ({
										...p,
										timeline: {
											...p.timeline,
											segments: p.timeline.segments.map((s, idx) => (idx === i ? { ...s, end: Math.max(Math.min(newEnd, videoDuration), segment.start + 1) } : s)),
										},
									}));
								};

								const handleMouseUp = () => {
									window.removeEventListener("mousemove", update);
									window.removeEventListener("mouseup", handleMouseUp);
								};

								window.addEventListener("mousemove", update);
								window.addEventListener("mouseup", handleMouseUp);
							}}
						/>
					</SegmentRoot>
				);
			})}
		</TrackRoot>
	);
}

