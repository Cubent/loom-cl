"use client";

import { useState } from "react";
import { useEditorContext, type BackgroundSource, type RGBColor } from "./context/EditorContext";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { CameraTab } from "./tabs/CameraTab";
import { AudioTab } from "./tabs/AudioTab";
import { CursorTab } from "./tabs/CursorTab";

type TabId = "background" | "camera" | "audio" | "cursor";

export function EditorSidebar() {
	const { project, setProject } = useEditorContext();
	const [activeTab, setActiveTab] = useState<TabId>("background");

	const tabs: { id: TabId; label: string }[] = [
		{ id: "background", label: "Background" },
		{ id: "camera", label: "Camera" },
		{ id: "audio", label: "Audio" },
		{ id: "cursor", label: "Cursor" },
	];

	return (
		<div className="flex flex-col w-80 bg-gray-2 rounded-lg border border-gray-3">
			<div className="flex border-b border-gray-3">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.id
								? "bg-gray-3 text-gray-12 border-b-2 border-blue-9"
								: "text-gray-11 hover:bg-gray-3"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div className="flex-1 overflow-y-auto p-4">
				{activeTab === "background" && <BackgroundTab />}
				{activeTab === "camera" && <CameraTab />}
				{activeTab === "audio" && <AudioTab />}
				{activeTab === "cursor" && <CursorTab />}
			</div>
		</div>
	);
}

