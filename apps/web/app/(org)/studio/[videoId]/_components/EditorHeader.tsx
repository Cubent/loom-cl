"use client";

import { Button } from "@cap/ui";
import { useEditorContext } from "./context/EditorContext";

export function EditorHeader() {
	const { editorState, setEditorState, history, projectActions } = useEditorContext();

	const handlePlayPause = () => {
		setEditorState((state) => ({
			...state,
			playing: !state.playing,
		}));
	};

	const handleSplit = () => {
		const time = editorState.playbackTime;
		projectActions.splitClipSegment(time);
	};

	return (
		<div className="flex items-center justify-between h-14 px-4 border-b border-gray-3">
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={history.undo}
					disabled={!history.canUndo()}
				>
					Undo
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={history.redo}
					disabled={!history.canRedo()}
				>
					Redo
				</Button>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={handleSplit}
					disabled={editorState.playing}
				>
					Split (C)
				</Button>
				<Button variant="dark" size="sm" onClick={handlePlayPause}>
					{editorState.playing ? "Pause" : "Play"}
				</Button>
				<Button variant="dark" size="sm">
					Export
				</Button>
			</div>
		</div>
	);
}

