# Studio Mode Implementation Plan

## Overview
Make the web Studio Mode editor exactly match the desktop editor functionality.

## Phase 1: Core Infrastructure (Priority: CRITICAL)
1. ✅ Basic page structure and routing
2. ✅ Editor context with state management
3. ⏳ Project history (undo/redo) - needs proper implementation
4. ⏳ Frame rendering system (WebCodecs/Canvas API)
5. ⏳ Video loading from API

## Phase 2: Player Component (Priority: HIGH)
1. ⏳ Canvas rendering with backgrounds, camera, effects
2. ⏳ Playback controls (play/pause, seek)
3. ⏳ Time display
4. ⏳ Aspect ratio selection
5. ⏳ Crop dialog functionality
6. ⏳ Preview canvas with checkerboard background

## Phase 3: Timeline Component (Priority: HIGH)
1. ⏳ ClipTrack with:
   - Waveform visualization
   - Drag handles for trimming
   - Split functionality (C key)
   - Delete functionality (Delete key)
   - Segment selection
2. ⏳ ZoomTrack with:
   - Zoom segments
   - Drag handles
   - Split/delete functionality
3. ⏳ SceneTrack with:
   - Scene segments
   - Camera positioning
   - Split/delete functionality
4. ⏳ Timeline markings
5. ⏳ Playhead with preview time
6. ⏳ Keyboard shortcuts (C, Delete, Escape)
7. ⏳ Drag and drop for segments
8. ⏳ Zoom controls (Ctrl+scroll)

## Phase 4: Config Sidebar (Priority: MEDIUM)
1. ⏳ Background Tab:
   - Wallpaper selection
   - Image upload/selection
   - Color picker
   - Gradient editor
   - Crop settings
2. ⏳ Camera Tab:
   - Shape selection (square/source)
   - Position controls
   - Size controls
   - Shadow settings
   - Border settings
3. ⏳ Audio Tab:
   - Microphone volume
   - System volume
   - Stereo mode selection
   - Mute toggle
4. ⏳ Cursor Tab:
   - Hide toggle
   - Size slider
   - Style selection
   - Smooth movement toggle
   - Tension/Friction/Mass sliders
5. ⏳ Captions Tab (if enabled):
   - Caption editing
   - Font settings
   - Position settings
   - Style settings

## Phase 5: Header Component (Priority: MEDIUM)
1. ⏳ Delete recording button
2. ⏳ Open recording bundle (web: download)
3. ⏳ Name editor
4. ⏳ Presets dropdown
5. ⏳ Undo/Redo buttons
6. ⏳ Share button
7. ⏳ Export button

## Phase 6: Export Functionality (Priority: MEDIUM)
1. ⏳ ExportDialog component
2. ⏳ Format selection (MP4, GIF)
3. ⏳ Resolution options
4. ⏳ FPS options
5. ⏳ Compression options
6. ⏳ Export destination (file, clipboard, link)
7. ⏳ Export estimates
8. ⏳ Export progress tracking

## Phase 7: Advanced Features (Priority: LOW)
1. ⏳ Presets management
2. ⏳ Custom domain support
3. ⏳ Performance optimizations
4. ⏳ Error handling and recovery

## Implementation Order
1. Project history (undo/redo)
2. Canvas rendering system
3. Enhanced Player component
4. Complete Timeline with all tracks
5. Complete Config Sidebar
6. Header component
7. Export functionality

