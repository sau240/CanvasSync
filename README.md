# 🎨 CanvasSync — Real-Time Collaborative Whiteboard & Design Studio

> A high-performance, real-time collaborative vector canvas and design workspace inspired by Figma and Canva. Built with **FastAPI**, **WebSockets**, **React**, and **TypeScript**.

---

## 🌟 Key Features

### 🖌️ Vector Canvas & Drawing Engine
- **Core Geometry**: Rectangles, Circles, Rounded Rectangles, Triangles, Diamonds, Stars, Hexagons, Pentagons, Octagons, Cubes, and Cylinders.
- **Smart Connectors & Lines**: Straight Lines, Directional Arrow Lines, Bidirectional Arrows, and Elbow Connectors.
- **Rich Callouts & Flowcharts**: Speech Bubbles, Cloud Callouts, and Flowchart symbols.
- **Inline Text Editing**: Double-click text manipulation with custom font families, font sizes, weights, and alignments.

### 🖼️ Advanced Image Support
- **Multi-Method Import**: 
  - 📁 Local file picker with multi-image support
  - 📋 Direct clipboard paste (`Ctrl+V` / `Cmd+V`)
  - 🖱️ Drag-and-drop files directly onto canvas coordinates
  - 🌐 Image URL import modal
- **Transformations**: Live resize with aspect-ratio locking, angle rotation, opacity control, stroke borders, corner radius, and drop shadows.

### ⚡ Real-Time Collaboration & WebSockets
- **Sub-50ms Synchronized Canvas**: Broadcast shape creation, movement, styling, layer ordering, and deletion across all active peers.
- **Presence Tracking**: Live collaborator avatar stack, room occupancy indicators, and active connection status.
- **Isolated Workspaces**: 
  - 🔒 **Personal Workspaces**: Deterministic, private scratchpads.
  - 👥 **Live Collaboration Rooms**: Multi-user rooms with custom invite IDs.

### 📑 Professional Layers & Properties Panel
- **Figma-Style Layer Hierarchy**: Drag-to-reorder, layer locking, visibility toggling, and quick selection.
- **Contextual Inspector**: Fine-grained color pickers (Fill/Stroke), border width, shadow offsets, blur filters, and rotation controls.
- **Full Canvas & Selection Export**: Export full artwork or isolated selections to high-resolution PNG.

### 🔍 Viewport Navigation
- **Infinite Canvas Pan & Zoom**: 
  - `Space + Drag` or Middle-Click to pan
  - `Ctrl + Wheel` or `Ctrl + +/-` for smooth zoom
  - `Ctrl + 0` to Fit Board to Screen
  - `Shift + 2` to Zoom to Selection

---

## 🏗️ Architecture & Tech Stack

