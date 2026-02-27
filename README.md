# Chalk

A design canvas application built with Tauri v2, React 19, and Fabric.js. Think Figma, but as a native desktop app.

## What is Chalk?

Chalk is an open-source design tool that runs natively on your desktop. It provides a canvas-based editor for creating and editing vector graphics, frames, text, and components — with an integrated AI chat assistant for design help.

## Tech Stack

- **Tauri v2** — Native desktop shell (Rust backend)
- **React 19** — UI framework
- **Fabric.js v7** — Canvas rendering and object manipulation
- **Zustand v5** — State management
- **Tailwind v4** — Styling
- **shadcn/ui + Radix UI** — UI components
- **Motion** — Animations
- **cmdk** — Command palette

## Features

### Canvas & Drawing

- Rectangle, ellipse, and text tools
- Frame containers (like Figma's frames) with child nesting
- Drag-and-drop layer reordering with visual drop indicators
- Pan and zoom (trackpad and mouse wheel)
- Snap-to-grid and smart alignment guides
- Copy, cut, paste with offset
- Undo/redo history (50 states)
- Z-order controls (bring to front, send to back)

### Components

- Mark any object as a component
- Component layers display with purple diamond icon and purple text
- Toggle component status from the properties panel

### Layers Panel

- Hierarchical tree view mirroring canvas z-order
- Expand/collapse frames
- Visibility toggle per layer
- Drag-and-drop reparenting (above, below, inside)
- Color-coded icons: blue for frames, purple for components

### Properties Panel

- Position, size, rotation controls
- Fill and stroke with color picker
- Opacity and corner radius
- Text properties: font family, size, weight, style, alignment, line height, character spacing
- System font detection
- Frame presets (Desktop, Tablet, Mobile)
- Alignment tools (relative to parent frame or canvas)
- Export to PNG, SVG, JPEG at configurable scale
- Collapsible edge-anchored mini panel when closed

### Multi-Tab Support

- Multiple canvas tabs with independent state
- Per-tab canvas serialization and restore
- Per-tab chat sessions

### AI Chat

- Floating chat widget at bottom-right corner
- Collapsible mini-bar showing agent status when minimized
- Model selector (Claude Sonnet, Opus, Haiku)
- Parallel agents (1-5) with status indicators
- File attachments
- New chat button to clear conversation
- Per-tab chat sessions

### UI

- Custom macOS title bar with traffic light positioning
- Command palette (Cmd+K) with tools, edit, view, AI, and system commands
- Settings dialog
- Keyboard shortcuts for all major actions
- Dark theme throughout

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development
pnpm tauri:dev

# Build for production
pnpm tauri:build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Keyboard Shortcuts

| Shortcut         | Action                  |
| ---------------- | ----------------------- |
| V                | Select tool             |
| R                | Rectangle tool          |
| O                | Ellipse tool            |
| T                | Text tool               |
| F                | Frame tool              |
| H                | Hand (pan) tool         |
| Cmd+C            | Copy                    |
| Cmd+X            | Cut                     |
| Cmd+V            | Paste                   |
| Cmd+D            | Duplicate               |
| Cmd+Z            | Undo                    |
| Cmd+Shift+Z      | Redo                    |
| Cmd+K            | Command palette         |
| Cmd+J            | Toggle AI chat          |
| Cmd+\            | Toggle layers panel     |
| Cmd+.            | Toggle properties panel |
| Cmd+,            | Settings                |
| Delete/Backspace | Delete selected         |
| ]                | Bring to front          |
| [                | Send to back            |

## What's Being Built

- [ ] Real AI backend integration (currently placeholder responses)
- [ ] Persistent storage via Tauri/Rust IPC
- [ ] Component instances and overrides
- [ ] Auto-layout / flex containers
- [ ] Multiplayer / real-time collaboration
- [ ] Plugin system
- [ ] Vector pen tool and boolean operations
- [ ] Prototyping and interactions
- [ ] Design tokens and styles
- [ ] Asset library and image support
- [ ] Export to code (HTML/CSS, React, SwiftUI)

## Project Structure

```
src/
  features/
    studio/           # Canvas, toolbar, layers, properties
      components/
      hooks/
      store/
      types/
      utils/
    chat/             # AI chat panel
      components/
      store/
      types/
  components/ui/      # shadcn/ui primitives
  hooks/              # Shared hooks
  lib/                # Utilities
```

## License

MIT
