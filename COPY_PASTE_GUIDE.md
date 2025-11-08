# Copy & Paste Guide: Desktop Editor → Web Studio Mode

## Overview
This guide tells you exactly what to copy from `apps/desktop/src/routes/editor/` and where to paste it in `apps/web/app/(org)/studio/[videoId]/_components/`.

## File Mapping

### 1. Main Editor Component
**FROM:** `apps/desktop/src/routes/editor/Editor.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/StudioEditor.tsx`
**ADAPTATIONS NEEDED:**
- Replace `EditorInstanceContextProvider` with web context (already have `EditorContextProvider`)
- Remove Tauri-specific code (`createTauriEventListener`, `events.renderFrameEvent`)
- Convert SolidJS syntax (`createEffect`, `createMemo`, `Show`, `Switch`, `Match`) to React
- Keep the `Dialogs` component structure

### 2. Player Component
**FROM:** `apps/desktop/src/routes/editor/Player.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/EditorPlayer.tsx`
**ADAPTATIONS NEEDED:**
- Replace `latestFrame()` (ImageData from Rust) with canvas rendering from video element
- Convert SolidJS to React hooks
- Replace `commands.stopPlayback()`, `commands.startPlayback()`, `commands.seekTo()` with video element methods
- Keep all UI structure exactly the same (AspectRatioSelect, Crop button, PreviewCanvas, Time display, controls)

### 3. Header Component
**FROM:** `apps/desktop/src/routes/editor/Header.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/EditorHeader.tsx`
**ADAPTATIONS NEEDED:**
- Remove Tauri-specific code (`revealItemInDir`, `commands.editorDeleteProject`, `commands.setPrettyName`)
- Convert SolidJS to React
- Keep all buttons and layout exactly the same

### 4. ConfigSidebar Component
**FROM:** `apps/desktop/src/routes/editor/ConfigSidebar.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/EditorSidebar.tsx`
**ADAPTATIONS NEEDED:**
- Convert SolidJS to React
- Replace `convertFileSrc()` (Tauri) with direct URLs for web
- Replace `commands.setProjectConfig()` with API calls
- Keep all tabs and UI exactly the same

### 5. UI Components
**FROM:** `apps/desktop/src/routes/editor/ui.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/ui.tsx`
**ADAPTATIONS NEEDED:**
- Convert SolidJS components to React
- Replace `@kobalte/core` with React equivalents (or keep if available for React)
- Keep all styling exactly the same

### 6. Context
**FROM:** `apps/desktop/src/routes/editor/context.ts`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/context/EditorContext.tsx`
**ADAPTATIONS NEEDED:**
- Convert SolidJS context to React Context
- Remove `latestFrame` (ImageData from WebSocket) - replace with video rendering
- Remove Tauri-specific code (`commands`, `events`)
- Keep all state structure exactly the same

### 7. Timeline Components
**FROM:** `apps/desktop/src/routes/editor/Timeline/`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/timeline/`
**FILES TO COPY:**
- `index.tsx` → `index.tsx` (already done, but verify)
- `ClipTrack.tsx` → `ClipTrack.tsx` (already done, but verify)
- `ZoomTrack.tsx` → `ZoomTrack.tsx` (already done, but verify)
- `SceneTrack.tsx` → `SceneTrack.tsx` (already done, but verify)
- `Track.tsx` → `Track.tsx` (already done, but verify)
- `context.ts` → `context.tsx` (already done, but verify)
- `sectionMarker.ts` → `sectionMarker.ts` (if exists)
**ADAPTATIONS NEEDED:**
- Convert SolidJS to React
- Keep all styling exactly the same

### 8. Timeline Styles
**FROM:** `apps/desktop/src/routes/editor/Timeline/styles.css`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/timeline/styles.css`
**ACTION:** Copy exactly as-is (no changes needed)

### 9. Supporting Components

#### AspectRatioSelect
**FROM:** `apps/desktop/src/routes/editor/AspectRatioSelect.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/AspectRatioSelect.tsx`
**ADAPTATIONS:** Convert SolidJS to React

#### PresetsDropdown
**FROM:** `apps/desktop/src/routes/editor/PresetsDropdown.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/PresetsDropdown.tsx`
**ADAPTATIONS:** Convert SolidJS to React, replace API calls

#### ShareButton
**FROM:** `apps/desktop/src/routes/editor/ShareButton.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/ShareButton.tsx`
**ADAPTATIONS:** Convert SolidJS to React, replace Tauri commands with API calls

#### ExportDialog
**FROM:** `apps/desktop/src/routes/editor/ExportDialog.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/ExportDialog.tsx`
**ADAPTATIONS:** Convert SolidJS to React, replace `exportVideo()` with web API

#### CaptionsTab
**FROM:** `apps/desktop/src/routes/editor/CaptionsTab.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/tabs/CaptionsTab.tsx`
**ADAPTATIONS:** Convert SolidJS to React

#### ShadowSettings
**FROM:** `apps/desktop/src/routes/editor/ShadowSettings.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/ShadowSettings.tsx`
**ADAPTATIONS:** Convert SolidJS to React

#### TextInput
**FROM:** `apps/desktop/src/routes/editor/TextInput.tsx`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/TextInput.tsx`
**ADAPTATIONS:** Convert SolidJS to React

### 10. Utility Files
**FROM:** `apps/desktop/src/routes/editor/utils.ts`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/utils.ts`
**ADAPTATIONS:** Remove Tauri-specific code, keep `formatTime` function

**FROM:** `apps/desktop/src/routes/editor/projectConfig.ts`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/projectConfig.ts`
**ACTION:** Copy exactly as-is (no changes needed)

**FROM:** `apps/desktop/src/routes/editor/useEditorShortcuts.ts`
**TO:** `apps/web/app/(org)/studio/[videoId]/_components/useEditorShortcuts.ts`
**ADAPTATIONS:** Convert SolidJS to React hooks

## Step-by-Step Copy Process

### Step 1: Copy Timeline Styles (Easiest - No Changes)
```bash
# Copy CSS file
cp apps/desktop/src/routes/editor/Timeline/styles.css apps/web/app/(org)/studio/[videoId]/_components/timeline/styles.css
```

### Step 2: Copy Project Config (No Changes)
```bash
cp apps/desktop/src/routes/editor/projectConfig.ts apps/web/app/(org)/studio/[videoId]/_components/projectConfig.ts
```

### Step 3: Copy Supporting Components
Copy these files and convert SolidJS → React:
1. `AspectRatioSelect.tsx`
2. `PresetsDropdown.tsx`
3. `ShareButton.tsx`
4. `ExportDialog.tsx`
5. `CaptionsTab.tsx`
6. `ShadowSettings.tsx`
7. `TextInput.tsx`
8. `utils.ts` (remove Tauri code)
9. `useEditorShortcuts.ts` (convert to React hook)

### Step 4: Copy UI Components
Copy `ui.tsx` and convert all SolidJS components to React equivalents.

### Step 5: Copy Main Components
1. `Editor.tsx` → `StudioEditor.tsx` (adapt context)
2. `Player.tsx` → `EditorPlayer.tsx` (adapt rendering)
3. `Header.tsx` → `EditorHeader.tsx` (remove Tauri)
4. `ConfigSidebar.tsx` → `EditorSidebar.tsx` (convert tabs)

### Step 6: Update Context
Copy structure from `context.ts` and adapt to React Context API.

## Key Conversion Patterns

### SolidJS → React
- `createSignal()` → `useState()`
- `createStore()` → `useState()` with object or `useReducer()`
- `createEffect()` → `useEffect()`
- `createMemo()` → `useMemo()`
- `Show when={...}` → `{condition && <Component />}`
- `Switch/Match` → `if/else` or `switch` statements
- `For each={...}` → `.map()`
- `onMount()` → `useEffect(() => {}, [])`
- `onCleanup()` → `useEffect(() => { return () => {} })`

### Tauri → Web API
- `commands.*` → API calls or direct browser APIs
- `convertFileSrc()` → Direct URLs
- `events.*` → Event emitters or state updates
- `revealItemInDir()` → Not applicable (or use download)
- `Menu.new()` → Custom dropdown components

## Priority Order

1. **Timeline styles** (copy CSS - no changes)
2. **Project config** (copy - no changes)
3. **Utils** (copy and remove Tauri)
4. **UI components** (copy and convert)
5. **Supporting components** (copy and convert)
6. **Main components** (copy and convert)
7. **Context** (adapt structure)

## Notes

- Keep ALL styling exactly the same
- Keep ALL component structure exactly the same
- Only change: SolidJS → React, Tauri → Web APIs
- The Timeline is already mostly done, just verify it matches

