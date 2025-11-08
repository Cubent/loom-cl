"use client";

import { useEditorContext, type BackgroundSource, type RGBColor } from "../context/EditorContext";

const BACKGROUND_COLORS: RGBColor[] = [
	[0, 0, 0], // Black
	[255, 255, 255], // White
	[71, 133, 255], // Blue
	[255, 71, 102], // Red
	[71, 255, 133], // Green
	[255, 200, 71], // Yellow
	[200, 71, 255], // Purple
	[255, 133, 71], // Orange
];

const DEFAULT_GRADIENT_FROM: RGBColor = [71, 133, 255];
const DEFAULT_GRADIENT_TO: RGBColor = [255, 71, 102];

export function BackgroundTab() {
	const { project, setProject } = useEditorContext();

	const setBackgroundSource = (source: BackgroundSource) => {
		setProject((p) => ({
			...p,
			background: {
				...p.background,
				source,
			},
		}));
	};

	return (
		<div className="space-y-4">
			<div>
				<label className="block text-sm font-medium text-gray-12 mb-2">
					Background Type
				</label>
				<div className="grid grid-cols-2 gap-2">
					<button
						onClick={() =>
							setBackgroundSource({
								type: "color",
								color: [0, 0, 0],
							})
						}
						className={`p-3 rounded border ${
							project.background.source.type === "color"
								? "border-blue-9 bg-blue-3"
								: "border-gray-4"
						}`}
					>
						Color
					</button>
					<button
						onClick={() =>
							setBackgroundSource({
								type: "gradient",
								from: DEFAULT_GRADIENT_FROM,
								to: DEFAULT_GRADIENT_TO,
							})
						}
						className={`p-3 rounded border ${
							project.background.source.type === "gradient"
								? "border-blue-9 bg-blue-3"
								: "border-gray-4"
						}`}
					>
						Gradient
					</button>
					<button
						onClick={() =>
							setBackgroundSource({
								type: "image",
								url: "",
							})
						}
						className={`p-3 rounded border ${
							project.background.source.type === "image"
								? "border-blue-9 bg-blue-3"
								: "border-gray-4"
						}`}
					>
						Image
					</button>
					<button
						onClick={() =>
							setBackgroundSource({
								type: "wallpaper",
								name: "macOS/tahoe-dark",
							})
						}
						className={`p-3 rounded border ${
							project.background.source.type === "wallpaper"
								? "border-blue-9 bg-blue-3"
								: "border-gray-4"
						}`}
					>
						Wallpaper
					</button>
				</div>
			</div>

			{project.background.source.type === "color" && (
				<div>
					<label className="block text-sm font-medium text-gray-12 mb-2">
						Color
					</label>
					<div className="grid grid-cols-4 gap-2">
						{BACKGROUND_COLORS.map((color, i) => (
							<button
								key={i}
								onClick={() =>
									setBackgroundSource({
										type: "color",
										color,
									})
								}
								className="h-12 rounded border-2 border-gray-4 hover:border-gray-6"
								style={{
									backgroundColor: `rgb(${color.join(",")})`,
								}}
							/>
						))}
					</div>
					<input
						type="color"
						value={`#${project.background.source.color
							.map((c) => c.toString(16).padStart(2, "0"))
							.join("")}`}
						onChange={(e) => {
							const hex = e.target.value;
							const r = parseInt(hex.slice(1, 3), 16);
							const g = parseInt(hex.slice(3, 5), 16);
							const b = parseInt(hex.slice(5, 7), 16);
							setBackgroundSource({
								type: "color",
								color: [r, g, b],
							});
						}}
						className="mt-2 w-full h-10 rounded"
					/>
				</div>
			)}

			{project.background.source.type === "gradient" && (
				<div className="space-y-2">
					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							From Color
						</label>
						<input
							type="color"
							value={`#${project.background.source.from
								.map((c) => c.toString(16).padStart(2, "0"))
								.join("")}`}
							onChange={(e) => {
								const hex = e.target.value;
								const r = parseInt(hex.slice(1, 3), 16);
								const g = parseInt(hex.slice(3, 5), 16);
								const b = parseInt(hex.slice(5, 7), 16);
								setBackgroundSource({
									type: "gradient",
									from: [r, g, b],
									to: project.background.source.to,
								});
							}}
							className="w-full h-10 rounded"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							To Color
						</label>
						<input
							type="color"
							value={`#${project.background.source.to
								.map((c) => c.toString(16).padStart(2, "0"))
								.join("")}`}
							onChange={(e) => {
								const hex = e.target.value;
								const r = parseInt(hex.slice(1, 3), 16);
								const g = parseInt(hex.slice(3, 5), 16);
								const b = parseInt(hex.slice(5, 7), 16);
								setBackgroundSource({
									type: "gradient",
									from: project.background.source.from,
									to: [r, g, b],
								});
							}}
							className="w-full h-10 rounded"
						/>
					</div>
				</div>
			)}
		</div>
	);
}

