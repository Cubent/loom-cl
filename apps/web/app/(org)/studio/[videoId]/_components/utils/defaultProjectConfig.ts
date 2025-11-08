"use client";

import type { ProjectConfiguration } from "../types";

export function getDefaultProjectConfig(duration: number): ProjectConfiguration {
	return {
		aspectRatio: null,
		background: {
			source: { type: "wallpaper", path: null },
			blur: 0,
			padding: 0,
			rounding: 0,
			inset: 0,
			crop: null,
		},
		camera: {
			hide: false,
			mirror: false,
			position: { x: "right", y: "bottom" },
			size: 200,
			zoom_size: null,
		},
		audio: {
			mute: false,
			improve: false,
		},
		cursor: {
			hide: false,
			size: 1,
			type: "pointer",
			animationStyle: "regular",
			tension: 0.5,
			mass: 0.5,
			friction: 0.5,
		},
		hotkeys: {
			show: true,
		},
		timeline: {
			segments: [
				{
					timescale: 1,
					start: 0,
					end: duration,
				},
			],
			zoomSegments: [],
			sceneSegments: [],
		},
	};
}

