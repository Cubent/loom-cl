"use client";

import { EditorContextProvider } from "./context/EditorContext";
import { EditorHeader } from "./EditorHeader";
import { EditorPlayer } from "./EditorPlayer";
import { Timeline } from "./timeline";
import { EditorSidebar } from "./EditorSidebar";

interface StudioEditorProps {
	videoId: string;
	userId: string;
}

export function StudioEditor({ videoId, userId }: StudioEditorProps) {
	return (
		<EditorContextProvider videoId={videoId} userId={userId}>
			<div className="flex flex-col h-screen w-full bg-gray-1 dark:bg-gray-2">
				<EditorHeader />
				<div className="flex flex-1 overflow-hidden gap-2 p-2">
					<div className="flex flex-col flex-1 min-w-0">
						<div className="flex flex-1 gap-2 pb-1">
							<EditorPlayer />
							<EditorSidebar />
						</div>
						<Timeline />
					</div>
				</div>
			</div>
		</EditorContextProvider>
	);
}

