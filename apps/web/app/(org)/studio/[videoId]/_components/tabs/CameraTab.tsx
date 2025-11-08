"use client";

import { useEditorContext } from "../context/EditorContext";

export function CameraTab() {
	const { project, setProject } = useEditorContext();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<label className="text-sm font-medium text-gray-12">Hide Camera</label>
				<input
					type="checkbox"
					checked={project.camera.hide}
					onChange={(e) =>
						setProject((p) => ({
							...p,
							camera: {
								...p.camera,
								hide: e.target.checked,
							},
						}))
					}
				/>
			</div>

			{!project.camera.hide && (
				<>
					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Shape
						</label>
						<select
							value={project.camera.shape}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									camera: {
										...p.camera,
										shape: e.target.value as "square" | "source",
									},
								}))
							}
							className="w-full px-3 py-2 bg-gray-3 border border-gray-4 rounded"
						>
							<option value="square">Square</option>
							<option value="source">Source</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Position X: {project.camera.position.x}
						</label>
						<input
							type="range"
							min="0"
							max="1920"
							value={project.camera.position.x}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									camera: {
										...p.camera,
										position: {
											...p.camera.position,
											x: parseInt(e.target.value),
										},
									},
								}))
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Position Y: {project.camera.position.y}
						</label>
						<input
							type="range"
							min="0"
							max="1080"
							value={project.camera.position.y}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									camera: {
										...p.camera,
										position: {
											...p.camera.position,
											y: parseInt(e.target.value),
										},
									},
								}))
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-12 mb-2">
							Size: {project.camera.size.x} × {project.camera.size.y}
						</label>
						<input
							type="range"
							min="100"
							max="500"
							value={project.camera.size.x}
							onChange={(e) => {
								const size = parseInt(e.target.value);
								setProject((p) => ({
									...p,
									camera: {
										...p.camera,
										size: { x: size, y: size },
									},
								}));
							}}
							className="w-full"
						/>
					</div>

					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-gray-12">Shadow</label>
						<input
							type="checkbox"
							checked={project.camera.shadow}
							onChange={(e) =>
								setProject((p) => ({
									...p,
									camera: {
										...p.camera,
										shadow: e.target.checked,
									},
								}))
							}
						/>
					</div>
				</>
			)}
		</div>
	);
}

