"use client";

import { useEditorContext } from "../context/EditorContext";

export function AudioTab() {
	const { project, setProject } = useEditorContext();

	return (
		<div className="space-y-4">
			<div>
				<label className="block text-sm font-medium text-gray-12 mb-2">
					Microphone Volume: {Math.round(project.audio.microphone.volume * 100)}%
				</label>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={project.audio.microphone.volume}
					onChange={(e) =>
						setProject((p) => ({
							...p,
							audio: {
								...p.audio,
								microphone: {
									...p.audio.microphone,
									volume: parseFloat(e.target.value),
								},
							},
						}))
					}
					className="w-full"
				/>
				<div className="flex items-center justify-between mt-2">
					<label className="text-sm text-gray-11">Enabled</label>
					<input
						type="checkbox"
						checked={project.audio.microphone.enabled}
						onChange={(e) =>
							setProject((p) => ({
								...p,
								audio: {
									...p.audio,
									microphone: {
										...p.audio.microphone,
										enabled: e.target.checked,
									},
								},
							}))
						}
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-12 mb-2">
					System Audio Volume: {Math.round(project.audio.system.volume * 100)}%
				</label>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={project.audio.system.volume}
					onChange={(e) =>
						setProject((p) => ({
							...p,
							audio: {
								...p.audio,
								system: {
									...p.audio.system,
									volume: parseFloat(e.target.value),
								},
							},
						}))
					}
					className="w-full"
				/>
				<div className="flex items-center justify-between mt-2">
					<label className="text-sm text-gray-11">Enabled</label>
					<input
						type="checkbox"
						checked={project.audio.system.enabled}
						onChange={(e) =>
							setProject((p) => ({
								...p,
								audio: {
									...p.audio,
									system: {
										...p.audio.system,
										enabled: e.target.checked,
									},
								},
							}))
						}
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-12 mb-2">
					Stereo Mode
				</label>
				<select
					value={project.audio.stereoMode}
					onChange={(e) =>
						setProject((p) => ({
							...p,
							audio: {
								...p.audio,
								stereoMode: e.target.value as "stereo" | "monoL" | "monoR",
							},
						}))
					}
					className="w-full px-3 py-2 bg-gray-3 border border-gray-4 rounded"
				>
					<option value="stereo">Stereo</option>
					<option value="monoL">Mono Left</option>
					<option value="monoR">Mono Right</option>
				</select>
			</div>
		</div>
	);
}

