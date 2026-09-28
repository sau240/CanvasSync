import { create } from 'zustand';
import { roomsApi } from '../api/rooms.api';
import type { RoomRole } from '../types/permission.types';
import type { Room } from '../types/room.types';

export interface RoomUser {
  user_id: number;
  username?: string;
  email?: string;
  role?: RoomRole;
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'text' | 'image';

export interface ShadowStyle {
  enabled: boolean;
  color: string;
  blur: number; // feDropShadow stdDeviation
  offsetX: number;
  offsetY: number;
}

interface BaseShape {
  id: string;
  // User-defined layer name (e.g. "Rectangle 1", "Header BG")
  name?: string;
  // Layer visibility (hidden shapes are not rendered in SVG)
  hidden?: boolean;
  // Layer lock state (locked shapes cannot be selected/dragged/resized)
  locked?: boolean;
  // Rotation in degrees, applied around the shape's center. Only
  // rectangles and text are currently rotatable from the UI.
  rotation: number;

  // ---- Appearance (new) ----
  // Fill color. For 'line' shapes this is unused (lines use `stroke` only).
  fill?: string;
  fillOpacity?: number; // 0-1
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number; // 0-1
  opacity?: number; // overall shape opacity, 0-1
  shadow?: ShadowStyle;
  blur?: number; // gaussian blur radius in px, 0 = none
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  x: number; // center
  y: number; // center
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  x: number; // start point
  y: number;
  x2: number; // end point
  y2: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  width: number;
  fontSize: number;
  text: string;
}

export interface IconShape extends BaseShape {
  type: 'icon';
  x: number;
  y: number;
  width: number;
  height: number;
  iconId: string; // id into the icon registry (see icons.tsx)
}

export interface ImageShape extends BaseShape {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string; // base64 data URL or external URL
  fileName?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type CanvasShape = RectangleShape | CircleShape | LineShape | TextShape | IconShape | ImageShape;

// Kept as an alias so any older code importing `CanvasRectangle` still works.
export type CanvasRectangle = RectangleShape;

// Sensible defaults applied to any shape that doesn't specify these yet
// (e.g. shapes created before this field existed, or freshly-drawn shapes).
export const DEFAULT_APPEARANCE: Required<
  Pick<BaseShape, 'fill' | 'fillOpacity' | 'stroke' | 'strokeWidth' | 'strokeOpacity' | 'opacity' | 'blur'>
> & { shadow: ShadowStyle } = {
  fill: '#3654F4',
  fillOpacity: 1,
  stroke: '#1F2937',
  strokeWidth: 0,
  strokeOpacity: 1,
  opacity: 1,
  blur: 0,
  shadow: { enabled: false, color: '#1c2430', blur: 8, offsetX: 0, offsetY: 4 },
};

// A small, curated swatch palette shown in the "Selected Colors" section
// of the properties panel, plus a running list of colors the user has
// actually used (kept in the store so it persists across shape selections).
export const PALETTE_COLORS = [
  '#3654F4', '#2943C9', '#7C3AED', '#DB2777',
  '#DC2626', '#EA580C', '#D97706', '#65A30D',
  '#16A34A', '#0D9488', '#0891B2', '#2563EB',
  '#475569', '#1c2430', '#8A93A0', '#FFFFFF',
];

export const getRoomStorageKey = (roomId: string) => `canvas_shapes_${roomId}`;

export const loadLocalRoomShapes = (roomId: string): CanvasShape[] => {
  try {
    const raw = localStorage.getItem(getRoomStorageKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalRoomShapes = (roomId: string, shapes: CanvasShape[]): void => {
  try {
    localStorage.setItem(getRoomStorageKey(roomId), JSON.stringify(shapes));
  } catch (e) {
    console.error('Failed to persist room shapes to localStorage', e);
  }
};

interface RoomState {
  currentRoomId: string | null;
  activeRoom: Room | null;
  userRole: RoomRole | null;
  activeUsers: RoomUser[];
  shapes: CanvasShape[];
  isLoading: boolean;
  error: string | null;
  recentColors: string[];

  initRoom: (roomId: string) => void;
  fetchRoomDetails: (roomId: string) => Promise<void>;
  setActiveRoom: (room: Room | null) => void;
  setUserRole: (role: RoomRole | null) => void;

  setActiveUsers: (users: RoomUser[]) => void;
  addActiveUser: (user: RoomUser) => void;
  removeActiveUser: (userId: number) => void;

  addShape: (shape: CanvasShape) => void;
  updateShape: (id: string, patch: Partial<CanvasShape>) => void;
  removeShape: (id: string) => void;
  setShapes: (shapes: CanvasShape[]) => void;
  clearShapes: () => void;
  renameShape: (id: string, name: string) => void;
  toggleShapeVisibility: (id: string) => void;
  toggleShapeLock: (id: string) => void;
  reorderShape: (fromIndex: number, toIndex: number) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  addRecentColor: (color: string) => void;

  resetRoomState: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoomId: null,
  activeRoom: null,
  userRole: null,
  activeUsers: [],
  shapes: [],
  isLoading: false,
  error: null,
  recentColors: [],

  initRoom: (roomId: string) =>
    set((state) => {
      if (state.currentRoomId === roomId) {
        return state;
      }
      const loaded = loadLocalRoomShapes(roomId);
      return {
        currentRoomId: roomId,
        shapes: loaded,
        activeUsers: [],
        error: null,
      };
    }),

  fetchRoomDetails: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const room = await roomsApi.getRoomById(roomId);
      set({ activeRoom: room, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to fetch room details',
        isLoading: false,
      });
    }
  },

  setActiveRoom: (room) => set({ activeRoom: room }),

  setUserRole: (role) => set({ userRole: role }),

  setActiveUsers: (users) => set({ activeUsers: users }),

  addActiveUser: (user) =>
    set((state) => {
      const exists = state.activeUsers.some((u) => u.user_id === user.user_id);
      if (exists) return state;
      return { activeUsers: [...state.activeUsers, user] };
    }),

  removeActiveUser: (userId) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.user_id !== userId),
    })),

  addShape: (shape) =>
    set((state) => {
      const newShapes = [...state.shapes, { ...DEFAULT_APPEARANCE, ...shape }];
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  updateShape: (id, patch) =>
    set((state) => {
      const newShapes = state.shapes.map((s) => (s.id === id ? ({ ...s, ...patch } as CanvasShape) : s));
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  removeShape: (id) =>
    set((state) => {
      const newShapes = state.shapes.filter((s) => s.id !== id);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  setShapes: (shapes) =>
    set((state) => {
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, shapes);
      return { shapes };
    }),

  clearShapes: () =>
    set((state) => {
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, []);
      return { shapes: [] };
    }),

  renameShape: (id, name) =>
    set((state) => {
      const newShapes = state.shapes.map((s) => (s.id === id ? { ...s, name } : s));
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  toggleShapeVisibility: (id) =>
    set((state) => {
      const newShapes = state.shapes.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s));
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  toggleShapeLock: (id) =>
    set((state) => {
      const newShapes = state.shapes.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s));
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, newShapes);
      return { shapes: newShapes };
    }),

  reorderShape: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.shapes.length ||
        toIndex < 0 ||
        toIndex >= state.shapes.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const copy = [...state.shapes];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, copy);
      return { shapes: copy };
    }),

  bringForward: (id) =>
    set((state) => {
      const idx = state.shapes.findIndex((s) => s.id === id);
      if (idx === -1 || idx === state.shapes.length - 1) return state;
      const copy = [...state.shapes];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx + 1, 0, item);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, copy);
      return { shapes: copy };
    }),

  sendBackward: (id) =>
    set((state) => {
      const idx = state.shapes.findIndex((s) => s.id === id);
      if (idx <= 0) return state;
      const copy = [...state.shapes];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, item);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, copy);
      return { shapes: copy };
    }),

  bringToFront: (id) =>
    set((state) => {
      const idx = state.shapes.findIndex((s) => s.id === id);
      if (idx === -1 || idx === state.shapes.length - 1) return state;
      const copy = [...state.shapes];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, copy);
      return { shapes: copy };
    }),

  sendToBack: (id) =>
    set((state) => {
      const idx = state.shapes.findIndex((s) => s.id === id);
      if (idx <= 0) return state;
      const copy = [...state.shapes];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      if (state.currentRoomId) saveLocalRoomShapes(state.currentRoomId, copy);
      return { shapes: copy };
    }),

  addRecentColor: (color) =>
    set((state) => ({
      recentColors: [color, ...state.recentColors.filter((c) => c !== color)].slice(0, 12),
    })),

  resetRoomState: () =>
    set({
      currentRoomId: null,
      activeRoom: null,
      userRole: null,
      activeUsers: [],
      shapes: [],
      isLoading: false,
      error: null,
      recentColors: [],
    }),
}));