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

CanvasSync/ ├── backend/ # FastAPI REST & WebSocket Backend │ ├── middleware/ # JWT Auth & Security Interceptors │ ├── routes/ # Auth, Rooms, Permissions, Sync, and WebSocket Routers │ ├── models/ # Database Schemas & Models │ ├── database.py # MySQL / Database Connection Pooling │ └── main.py # App Entrypoint & CORS Configuration │ └── frontend--/ # React + Vite Frontend ├── src/ │ ├── api/ # Axios HTTP Clients │ ├── components/ # Reusable UI Modules & Drawers │ ├── pages/ # Canvas Studio, Dashboard, Auth & Settings │ ├── store/ # State Management (Zustand) │ ├── styles/ # Glassmorphic Theme & Design Tokens │ └── types/ # TypeScript Interfaces & Contracts

<img width="1024" height="452" alt="image" src="https://github.com/user-attachments/assets/b29e983d-b800-4560-8037-1cb3840925d9" />
<img width="1023" height="469" alt="image" src="https://github.com/user-attachments/assets/e9966b55-4c13-43d5-be89-515dcf47779f" />
<img width="1024" height="459" alt="image" src="https://github.com/user-attachments/assets/df2f9f93-9f90-4c90-a56d-a41743fa7058" />
<img width="1024" height="576" alt="image" src="https://github.com/user-attachments/assets/85d69d55-8454-4092-b6ac-e5d36e53ab29" />
<img width="1024" height="576" alt="image" src="https://github.com/user-attachments/assets/40dc5b7e-ea22-453e-b7d0-6d7329d34e6b" />



### 💻 Technologies
- **Frontend**: React 19, TypeScript, Vite, Zustand, Lucide Icons, Vanilla CSS Design System.
- **Backend**: Python 3.10+, FastAPI, WebSockets, Uvicorn, SQLAlchemy (Async), PyMySQL, Python-Jose (JWT), Bcrypt.
- **Databases**: MySQL (Stored Procedures & Relational Data), MongoDB (State persistence).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **MySQL / Database**: Active running instance

---

### 1. Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
# On Windows:
python -m venv venv
.\venv\Scripts\activate
# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Copy .env.example to .env and configure your database credentials:
cp .env.example .env

# 5. Start the FastAPI server with hot-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend will be available at: http://localhost:5173

⌨️ Keyboard Shortcuts Reference

Shortcut	Action
V	Pointer / Select Tool
R	Rectangle Tool
O	Circle Tool
L	Straight Line Tool
T	Text Tool
S	Quick Shapes Gallery Popover
I	Full Stickers & Icon Drawer
Ctrl + U	Import Image File Picker
Space + Drag	Pan Viewport
Ctrl + 0	Fit Canvas to Screen
Shift + 2	Zoom to Selected Shape
Delete / Backspace	Delete Selected Shape(s)
Ctrl + C / Ctrl + V	Copy / Paste Shapes & Images


🔒 Security Highlights
Stateless JWT Authentication: Secure bcrypt password hashing with 72-byte truncation safety.
Header & Query Token Sanitization: Handles Bearer prefixes cleanly across HTTP requests and WebSocket handshakes.
Strict Room Isolation: Role-based access control (Owner, Editor, Viewer) preventing unauthorized room joins.
📄 License
This project is licensed under the MIT License.
