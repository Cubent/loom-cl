"use client";

import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, type ReactNode } from "react";

export interface CropBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export const CROP_ZERO: CropBounds = { x: 0, y: 0, width: 0, height: 0 };

export type Ratio = [number, number];

export const COMMON_RATIOS: readonly Ratio[] = [
	[1, 1],
	[2, 1],
	[3, 2],
	[4, 3],
	[9, 16],
	[16, 9],
	[16, 10],
	[21, 9],
];

export interface CropperRef {
	setCropProperty: (field: keyof CropBounds, value: number) => void;
	reset: () => void;
	fill: () => void;
	animateTo: (real: CropBounds, durationMs?: number) => void;
}

interface CropperProps {
	onCropChange?: (bounds: CropBounds) => void;
	onInteraction?: (interacting: boolean) => void;
	onContextMenu?: (event: React.MouseEvent) => void;
	className?: string;
	minSize?: { x: number; y: number };
	maxSize?: { x: number; y: number };
	targetSize?: { x: number; y: number };
	initialCrop?: CropBounds | (() => CropBounds | undefined);
	aspectRatio?: Ratio;
	showBounds?: boolean;
	snapToRatioEnabled?: boolean;
	useBackdropFilter?: boolean;
	allowLightMode?: boolean;
	children?: ReactNode;
}

export const Cropper = forwardRef<CropperRef, CropperProps>((props, ref) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [crop, setCrop] = useState<CropBounds>(() => {
		if (props.initialCrop) {
			return typeof props.initialCrop === "function" 
				? props.initialCrop() || CROP_ZERO 
				: props.initialCrop;
		}
		return CROP_ZERO;
	});
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: CropBounds } | null>(null);

	const targetSize = props.targetSize || { x: 1920, y: 1080 };
	const aspectRatio = props.aspectRatio ? props.aspectRatio[0] / props.aspectRatio[1] : undefined;

	useImperativeHandle(ref, () => ({
		setCropProperty: (field: keyof CropBounds, value: number) => {
			setCrop((prev) => {
				const newCrop = { ...prev, [field]: value };
				props.onCropChange?.(newCrop);
				return newCrop;
			});
		},
		reset: () => {
			const initial = props.initialCrop 
				? (typeof props.initialCrop === "function" ? props.initialCrop() : props.initialCrop)
				: CROP_ZERO;
			setCrop(initial);
			props.onCropChange?.(initial);
		},
		fill: () => {
			const fillCrop: CropBounds = {
				x: 0,
				y: 0,
				width: targetSize.x,
				height: targetSize.y,
			};
			setCrop(fillCrop);
			props.onCropChange?.(fillCrop);
		},
		animateTo: (real: CropBounds, durationMs = 300) => {
			// Simple animation implementation
			const start = { ...crop };
			const startTime = Date.now();
			
			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / durationMs, 1);
				
				const easeInOutCubic = (t: number) =>
					t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
				
				const eased = easeInOutCubic(progress);
				
				const newCrop: CropBounds = {
					x: start.x + (real.x - start.x) * eased,
					y: start.y + (real.y - start.y) * eased,
					width: start.width + (real.width - start.width) * eased,
					height: start.height + (real.height - start.height) * eased,
				};
				
				setCrop(newCrop);
				props.onCropChange?.(newCrop);
				
				if (progress < 1) {
					requestAnimationFrame(animate);
				}
			};
			
			requestAnimationFrame(animate);
		},
	}));

	useEffect(() => {
		props.onCropChange?.(crop);
	}, [crop]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only left mouse button
		e.preventDefault();
		setIsDragging(true);
		setDragStart({
			x: e.clientX,
			y: e.clientY,
			crop: { ...crop },
		});
		props.onInteraction?.(true);
	}, [crop, props]);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !dragStart) return;
		
		const deltaX = e.clientX - dragStart.x;
		const deltaY = e.clientY - dragStart.y;
		
		// Simple drag implementation - adjust based on container size
		const container = containerRef.current;
		if (!container) return;
		
		const rect = container.getBoundingClientRect();
		const scaleX = targetSize.x / rect.width;
		const scaleY = targetSize.y / rect.height;
		
		const newCrop: CropBounds = {
			x: Math.max(0, Math.min(targetSize.x - crop.width, dragStart.crop.x + deltaX * scaleX)),
			y: Math.max(0, Math.min(targetSize.y - crop.height, dragStart.crop.y + deltaY * scaleY)),
			width: crop.width,
			height: crop.height,
		};
		
		setCrop(newCrop);
	}, [isDragging, dragStart, crop, targetSize]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		setDragStart(null);
		props.onInteraction?.(false);
	}, [props]);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		props.onContextMenu?.(e);
	}, [props]);

	// Calculate crop bounds in pixels based on container size
	const container = containerRef.current;
	const cropStyle: React.CSSProperties = container
		? {
				position: "absolute",
				left: `${(crop.x / targetSize.x) * 100}%`,
				top: `${(crop.y / targetSize.y) * 100}%`,
				width: `${(crop.width / targetSize.x) * 100}%`,
				height: `${(crop.height / targetSize.y) * 100}%`,
				border: "2px solid #3b82f6",
				boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
				cursor: isDragging ? "grabbing" : "grab",
			}
		: {};

	return (
		<div
			ref={containerRef}
			className={`relative ${props.className || ""}`}
			onMouseDown={handleMouseDown}
			onContextMenu={handleContextMenu}
			style={{ position: "relative", overflow: "hidden" }}
		>
			{props.children}
			{props.showBounds && (
				<div
					style={cropStyle}
					className="select-none"
				>
					{/* Crop overlay */}
				</div>
			)}
		</div>
	);
});

Cropper.displayName = "Cropper";

// Placeholder for createCropOptionsMenuItems - returns empty array for web
export function createCropOptionsMenuItems(_options: {
	aspect?: Ratio | null;
	snapToRatioEnabled?: boolean;
	onAspectChange?: (aspect: Ratio | null) => void;
	onSnapToRatioChange?: (enabled: boolean) => void;
}): Array<{ label: string; onClick: () => void }> {
	return [];
}

