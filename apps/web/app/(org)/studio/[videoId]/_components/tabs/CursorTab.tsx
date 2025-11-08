"use client";

import { useEditorContext } from "../context/EditorContext";

export function CursorTab() {
	const { project, setProject } = useEditorContext();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<label className="text-sm font-medium text-gray-12">Hide Cursor</label>
				<input
					type="checkbox"
					checked={project.cursor.hide}
					onChange={(e) =>
						setProject((p) => ({
							...p,
							cursor: {
								...p.cursor,
								hide: e.target.checked,
							},
						}))
					}
				/>
			</div>

			{!project.cursor.hide && (
				<>
					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Cursor Size: {project.cursor.size}x
						</label>
						<input
							type="range"
							min="0.5"
							max="2"
							step="0.1"
							value={project.cursor.size}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									cursor: {
										...p.cursor,
										size: parseFloat(e.target.value),
									},
								}))
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Cursor Style
						</label>
						<select
							value={project.cursor.style}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									cursor: {
										...p.cursor,
										style: e.target.value,
									},
								}))
							}
							className="w-full px-3 py-2 bg-gray-3 border border-gray-4 rounded"
						>
							<option value="default">Default</option>
							<option value="pointer">Pointer</option>
							<option value="crosshair">Crosshair</option>
							<option value="text">Text</option>
						</select>
					</div>
				</>
			)}
		</div>
	);
}

