"use client";

import { useEffect, useRef } from "react";

// Web version - no-op since we don't have window progress bar
export function useProgressBar(progress: () => number | undefined) {
	const progressRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		const p = progress();
		if (p !== progressRef.current) {
			progressRef.current = p;
			// Could show a progress indicator in the UI if needed
			// For now, just track it
		}
	}, [progress]);
}

