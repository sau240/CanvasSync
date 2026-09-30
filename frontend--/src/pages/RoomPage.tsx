import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsApi } from '../api/rooms.api';
import { permissionApi } from '../api/permission.api';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  DEFAULT_APPEARANCE,
  useRoomStore,
  type CanvasPage,
  type CanvasShape,
  type IconShape,
  type ImageShape,
  type RoomUser,
  type TextShape,
} from '../store/room.store';
import '../styles/theme.css';
import { tokenStorage } from '../utils/token_storage';
import IconLibraryPanel from './IconLibraryPanel';
import { IconGlyph, IconPrimitiveEl, TOOLBAR_ICONS, type IconDef } from './Icons';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import { findShapeDef, HEADER_SHAPES } from './Shapes';

type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'text' | 'icon' | 'image';

// Shapes that behave like a rotatable/resizable box (corner handles + rotation handle).
function isBoxShape(shape: CanvasShape): shape is Extract<CanvasShape, { type: 'rectangle' | 'text' | 'icon' | 'image' }> {
  return shape.type === 'rectangle' || shape.type === 'text' || shape.type === 'icon' || shape.type === 'image';
}

// Tab button for the merged right-hand "Design / Room" panel.
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '1 1 auto',
        padding: '12px 0',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: active ? '#818CF8' : '#64748B',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #818CF8' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 140ms ease',
      }}
    >
      {label}
    </button>
  );
}

interface CanvasOperation {
  operation_type:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'CLEAR'
    | 'REORDER'
    | 'PAGE_CREATE'
    | 'PAGE_UPDATE'
    | 'PAGE_DELETE'
    | 'PAGE_REORDER'
    | 'PAGES_SYNC';
  object?: CanvasShape;
  id?: string;
  shapes?: CanvasShape[];
  page?: CanvasPage;
  pages?: CanvasPage[];
}

type IncomingMessage =
  | { type: 'room_users'; users: RoomUser[] }
  | { type: 'user_joined'; user: RoomUser }
  | { type: 'user_left'; user_id: number }
  | { type: 'room_state'; shapes: CanvasShape[]; pages?: CanvasPage[] }
  | { type: 'canvas_operation'; operation: CanvasOperation };

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
const HANDLE_SIZE = 9;
const MIN_SIZE = 6;

// Infinite-canvas viewport tuning: how far you can zoom, and the world-space
// artboard document size.
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const GRID_SIZE = 40;
const BOARD_WIDTH = 1440;
const BOARD_HEIGHT = 900;
const DEFAULT_VIEW = { x: 80, y: 60, scale: 0.75 };

// Converts a raw screen-space movement vector into the shape's own
// (unrotated) coordinate frame, so resize handles still behave correctly
// when the shape has been rotated.
function toLocalDelta(dx: number, dy: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { dx: dx * cos + dy * sin, dy: -dx * sin + dy * cos };
}

function shapeHeightOf(shape: CanvasShape): number {
  if (shape.type === 'rectangle' || shape.type === 'icon' || shape.type === 'image') return shape.height;
  if (shape.type === 'text') return shape.fontSize * 1.4;
  return 0;
}

function getShapeCenter(shape: CanvasShape): { x: number; y: number } {
  switch (shape.type) {
    case 'rectangle':
    case 'text':
    case 'icon':
    case 'image':
      return { x: shape.x + shape.width / 2, y: shape.y + shapeHeightOf(shape) / 2 };
    case 'circle':
      return { x: shape.x, y: shape.y };
    case 'line':
      return { x: (shape.x + shape.x2) / 2, y: (shape.y + shape.y2) / 2 };
  }
}

// Unrotated bounding box in canvas coordinates, padded for stroke width
// and (if present) the shadow's blur + offset. Used for export cropping.
function getShapeBBox(shape: CanvasShape) {
  let x: number, y: number, width: number, height: number;

  if (shape.type === 'rectangle' || shape.type === 'icon' || shape.type === 'image') {
    x = shape.x; y = shape.y; width = shape.width; height = shape.height;
  } else if (shape.type === 'circle') {
    x = shape.x - shape.radius; y = shape.y - shape.radius;
    width = shape.radius * 2; height = shape.radius * 2;
  } else if (shape.type === 'line') {
    x = Math.min(shape.x, shape.x2); y = Math.min(shape.y, shape.y2);
    width = Math.max(1, Math.abs(shape.x2 - shape.x));
    height = Math.max(1, Math.abs(shape.y2 - shape.y));
  } else {
    x = shape.x; y = shape.y; width = shape.width; height = shapeHeightOf(shape);
  }

  const strokePad = (shape.strokeWidth ?? 0) / 2;
  const shadow = shape.shadow;
  const shadowPad = shadow?.enabled
    ? Math.max(shadow.blur + Math.abs(shadow.offsetX), shadow.blur + Math.abs(shadow.offsetY))
    : 0;
  const blurPad = shape.blur ?? 0;
  const pad = strokePad + shadowPad + blurPad + 4;

  return { x: x - pad, y: y - pad, width: width + pad * 2, height: height + pad * 2 };
}

// Union of every shape's bounding box, in world (canvas) coordinates. The
// canvas is unbounded now, so "export the whole canvas" means "export
// everything that's actually been drawn", not a fixed viewport.
function getUnionBBox(shapes: CanvasShape[]) {
  const boxes = shapes.map(getShapeBBox);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

type DragMode =
  | { kind: 'draw'; shapeId: string; startX: number; startY: number }
  | { kind: 'move'; shapeId: string; startX: number; startY: number; origin: CanvasShape }
  | { kind: 'movePage'; pageId: string; startX: number; startY: number; originPage: CanvasPage; originShapes: CanvasShape[] }
  | { kind: 'resize'; shapeId: string; handle: string; startX: number; startY: number; origin: CanvasShape }
  | { kind: 'rotate'; shapeId: string; centerX: number; centerY: number; startAngle: number; startRotation: number }
  | { kind: 'pan'; startClientX: number; startClientY: number; startViewX: number; startViewY: number };

function downloadBlob(content: string | Blob, filename: string, mime?: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function rasterizeSvgToPng(svgString: string, width: number, height: number, filename: string) {
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, filename);
      }, 'image/png');
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openDrawer, theme } = useSettingsStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const [connected, setConnected] = useState(false);
  // Set to a string explaining why access was denied (e.g. not invited).
  const [accessError, setAccessError] = useState<string | null>(null);
  // Whether this room is the current user's private personal workspace.
  const [isPersonalWorkspace, setIsPersonalWorkspace] = useState(false);
  // Whether the current user owns this room (can invite others).
  const [isOwner, setIsOwner] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [pendingIconId, setPendingIconId] = useState<string | null>(null);
  const [showIconLibrary, setShowIconLibrary] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  // Infinite-canvas viewport: world-space origin offset (in screen px at
  // scale 1) plus the current zoom level. screenPoint = worldPoint*scale + {x,y}.
  const [view, setView] = useState(DEFAULT_VIEW);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  // Design (properties) and Room (collaborators) used to be two separate
  // sidebars fighting for space on the right; now they're tabs in one panel.
  const [rightTab, setRightTab] = useState<'design' | 'room'>('design');
  // Newest-first list of recently-inserted shape ids, kept here (rather than
  // inside IconLibraryPanel) so it survives the panel closing and reopening.
  const [recentIconIds, setRecentIconIds] = useState<string[]>([]);

  // Invite collaborators state (owner-only, room tab)
  const [members, setMembers] = useState<RoomUser[]>([]);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteDoneMsg, setInviteDoneMsg] = useState<string | null>(null);

  // Left & Right sidebar toggles (Figma style)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Toast notification for copying room ID
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showImageImportModal, setShowImageImportModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<CanvasShape | null>(null);

  const AVATAR_COLORS = ['#3654F4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
  const getAvatarBg = (val: number | string) => {
    const code = typeof val === 'number' ? val : (String(val).charCodeAt(0) || 0);
    return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
  };
  const getInitials = (val?: string) => (val ? val.slice(0, 2).toUpperCase() : 'U');

  const handleCopyRoomId = () => {
    if (!roomId) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(roomId);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = roomId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setToastMessage('Room ID copied!');
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const {
    activeUsers,
    shapes,
    pages,
    activePageId,
    recentColors,
    initRoom,
    setActiveUsers,
    addActiveUser,
    removeActiveUser,
    addShape,
    updateShape,
    removeShape,
    setShapes,
    clearShapes,
    renameShape,
    toggleShapeVisibility,
    toggleShapeLock,
    bringForward,
    sendBackward,
    addRecentColor,
    addPage,
    updatePage,
    removePage,
    duplicatePage,
    setPages,
    setActivePageId,
  } = useRoomStore();

  // ----- Strict Room Isolation: Initialize store with roomId -----
  useEffect(() => {
    if (!roomId) return;
    initRoom(roomId);
    setSelectedShapeId(null);
  }, [roomId, initRoom]);

  // ----- Load room info: is this my personal workspace? am I the owner? -----
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      try {
        const [personal, room] = await Promise.all([
          roomsApi.getPersonalWorkspace(),
          roomsApi.getRoomById(roomId),
        ]);
        if (cancelled) return;
        if (personal.room_id === roomId) setIsPersonalWorkspace(true);
        setIsOwner(room.owner_id === user?.user_id);
        setAccessError(room.your_role ? null : 'You need an invite from the room owner to collaborate.');
      } catch {
        if (!cancelled) setAccessError("Couldn't load this room. It may not exist.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ----- WebSocket wiring -----
  useEffect(() => {
    if (!roomId) return;

    const token = tokenStorage.getAuthToken();
    if (!token) {
      console.log('No authentication token found');
      return;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/rooms/${roomId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setAccessError(null);
      ws.send(JSON.stringify({ type: 'join_room', room_id: roomId }));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: IncomingMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'room_users':
            setActiveUsers(message.users || []);
            break;
          case 'user_joined':
            addActiveUser(message.user);
            break;
          case 'user_left':
            removeActiveUser(message.user_id);
            break;
          case 'room_state': {
            if (message.shapes && message.shapes.length > 0) {
              setShapes(message.shapes);
            } else {
              // If server has no shapes for this room yet, check if we have local cached shapes for THIS room
              const currentRoomShapes = useRoomStore.getState().shapes;
              if (currentRoomShapes && currentRoomShapes.length > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'sync_canvas', room_id: roomId, shapes: currentRoomShapes }));
              }
            }
            if (message.pages && message.pages.length > 0) {
              setPages(message.pages);
            }
            break;
          }
          case 'canvas_operation': {
            const op = message.operation;
            if (op.operation_type === 'CREATE' && op.object) {
              addShape(op.object);
            } else if (op.operation_type === 'UPDATE' && op.object) {
              updateShape(op.object.id, op.object);
            } else if (op.operation_type === 'DELETE' && op.id) {
              removeShape(op.id);
            } else if (op.operation_type === 'CLEAR') {
              clearShapes();
            } else if (op.operation_type === 'REORDER' && op.shapes) {
              setShapes(op.shapes);
            } else if (op.operation_type === 'PAGE_CREATE' && op.page) {
              addPage(op.page);
            } else if (op.operation_type === 'PAGE_UPDATE' && op.page) {
              updatePage(op.page.id, op.page);
            } else if (op.operation_type === 'PAGE_DELETE' && op.id) {
              removePage(op.id);
            } else if ((op.operation_type === 'PAGE_REORDER' || op.operation_type === 'PAGES_SYNC') && op.pages) {
              setPages(op.pages);
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setAccessError((prev) => prev ?? 'Connection to the room closed.');
    };
    ws.onerror = () => setConnected(false);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'leave_room', room_id: roomId }));
        } catch {
          // ignore
        }
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          try {
            ws.close();
          } catch {
            // ignore
          }
        };
      }
    };
  }, [roomId, setActiveUsers, addActiveUser, removeActiveUser, addShape, updateShape, removeShape, clearShapes, setShapes]);

  const sendCanvasOperation = (operation: CanvasOperation) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'canvas_operation', room_id: roomId, operation }));
  };

  // ----- Layer manipulation handlers with WebSocket broadcasting -----
  const handleRenameLayer = (id: string, name: string) => {
    renameShape(id, name);
    const target = shapes.find((s) => s.id === id);
    if (target) {
      sendCanvasOperation({
        operation_type: 'UPDATE',
        object: { ...target, name },
      });
    }
  };

  const handleToggleVisibility = (id: string) => {
    toggleShapeVisibility(id);
    const target = shapes.find((s) => s.id === id);
    if (target) {
      sendCanvasOperation({
        operation_type: 'UPDATE',
        object: { ...target, hidden: !target.hidden },
      });
    }
  };

  const handleToggleLock = (id: string) => {
    toggleShapeLock(id);
    const target = shapes.find((s) => s.id === id);
    if (target) {
      sendCanvasOperation({
        operation_type: 'UPDATE',
        object: { ...target, locked: !target.locked },
      });
    }
  };

  const handleBringForward = (id: string) => {
    bringForward(id);
    setTimeout(() => {
      const currentShapes = useRoomStore.getState().shapes;
      sendCanvasOperation({
        operation_type: 'REORDER',
        shapes: currentShapes,
      });
    }, 0);
  };

  const handleSendBackward = (id: string) => {
    sendBackward(id);
    setTimeout(() => {
      const currentShapes = useRoomStore.getState().shapes;
      sendCanvasOperation({
        operation_type: 'REORDER',
        shapes: currentShapes,
      });
    }, 0);
  };

  // ----- Multi-Page Canvas Management -----
  const handleAddPage = () => {
    const newPage = addPage();
    sendCanvasOperation({
      operation_type: 'PAGE_CREATE',
      page: newPage,
    });
    setTimeout(() => {
      fitToPage(newPage.id);
    }, 60);
  };

  const handleDuplicatePage = (pageId: string) => {
    const newPage = duplicatePage(pageId);
    if (newPage) {
      sendCanvasOperation({
        operation_type: 'PAGE_CREATE',
        page: newPage,
      });
      const currentShapes = useRoomStore.getState().shapes;
      sendCanvasOperation({
        operation_type: 'REORDER',
        shapes: currentShapes,
      });
      setTimeout(() => {
        fitToPage(newPage.id);
      }, 60);
    }
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) return;
    removePage(pageId);
    sendCanvasOperation({
      operation_type: 'PAGE_DELETE',
      id: pageId,
    });
  };

  const handleRenamePage = (pageId: string, name: string) => {
    updatePage(pageId, { name });
    const target = pages.find((p) => p.id === pageId);
    if (target) {
      sendCanvasOperation({
        operation_type: 'PAGE_UPDATE',
        page: { ...target, name },
      });
    }
  };

  const fitToPage = (pageId?: string) => {
    const targetId = pageId || activePageId;
    const targetPage = pages.find((p) => p.id === targetId) || pages[0] || { x: 0, y: 0, width: 1440, height: 900 };
    if (!targetPage) return;

    setActivePageId(targetPage.id);
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pad = 80;
    const availW = Math.max(300, rect.width - pad * 2);
    const availH = Math.max(300, rect.height - pad * 2);
    const scale = Math.min(availW / targetPage.width, availH / targetPage.height, 1.0);
    const x = (rect.width - targetPage.width * scale) / 2 - targetPage.x * scale;
    const y = (rect.height - targetPage.height * scale) / 2 - targetPage.y * scale;

    setView({
      x: Math.round(x),
      y: Math.round(y),
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(scale * 100) / 100)),
    });
    setShowZoomMenu(false);
  };

  const activePageIndex = Math.max(0, pages.findIndex((p) => p.id === activePageId));
  const goToPrevPage = () => {
    if (activePageIndex > 0) {
      fitToPage(pages[activePageIndex - 1].id);
    }
  };
  const goToNextPage = () => {
    if (activePageIndex < pages.length - 1) {
      fitToPage(pages[activePageIndex + 1].id);
    }
  };

  // ----- Collaborator management (owner only) -----
  const loadMembers = async () => {
    if (!roomId) return;
    try {
      const rows = await permissionApi.listRoomMembers(roomId);
      setMembers(rows.map((m) => ({ user_id: m.user_id, username: m.user_name, email: m.email, role: m.role })));
    } catch {
      setMembers([]);
    }
  };

  useEffect(() => {
    if (isOwner && roomId) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, roomId]);

  const handleInviteSearch = async (q: string) => {
    setInviteQuery(q);
    if (!q.trim()) {
      setInviteResults([]);
      return;
    }
    try {
      const results = await roomsApi.searchUsers(q);
      const notAlreadyMember = results.filter(
        (r) => r.user_id !== user?.user_id && !members.some((m) => m.user_id === r.user_id),
      );
      setInviteResults(notAlreadyMember);
    } catch {
      setInviteResults([]);
    }
  };

  const grantAccess = async (targetUserId: number) => {
    if (!roomId) return;
    try {
      await permissionApi.grantPermission({ room_id: roomId, user_id: targetUserId, permission_level: 'EDITOR' });
      setInviteDoneMsg('User added. They can now join this room by ID and collaborate.');
      setInviteQuery('');
      setInviteResults([]);
      loadMembers();
      setTimeout(() => setInviteDoneMsg(null), 4000);
    } catch {
      setInviteDoneMsg('Could not invite that user. Try again.');
    }
  };

  const revokeAccess = async (targetUserId: number) => {
    if (!roomId) return;
    try {
      await permissionApi.revokePermission({ room_id: roomId, user_id: targetUserId });
      loadMembers();
    } catch {
      // ignore
    }
  };

  // Screen-space (px within the SVG element) -> world/canvas-space, taking
  // the current pan offset and zoom level into account.
  const screenToWorld = (screenX: number, screenY: number) => ({
    x: (screenX - view.x) / view.scale,
    y: (screenY - view.y) / view.scale,
  });

  const getPoint = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  };

  const importImage = (src: string, fileName?: string, worldPos?: { x: number; y: number }) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const svg = svgRef.current;
      let targetX: number;
      let targetY: number;

      if (worldPos) {
        targetX = worldPos.x;
        targetY = worldPos.y;
      } else if (svg) {
        const rect = svg.getBoundingClientRect();
        const center = screenToWorld(rect.width / 2, rect.height / 2);
        targetX = center.x;
        targetY = center.y;
      } else {
        targetX = BOARD_WIDTH / 2;
        targetY = BOARD_HEIGHT / 2;
      }

      const maxW = 500;
      const maxH = 400;
      let w = img.naturalWidth || 320;
      let h = img.naturalHeight || 240;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const id = crypto.randomUUID();
      const newImageShape: ImageShape = {
        id,
        type: 'image',
        name: fileName ? `Image (${fileName})` : 'Imported Image',
        fileName,
        src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        x: Math.round(targetX - w / 2),
        y: Math.round(targetY - h / 2),
        width: Math.max(MIN_SIZE, w),
        height: Math.max(MIN_SIZE, h),
        rotation: 0,
        ...DEFAULT_APPEARANCE,
        strokeWidth: 0,
      };

      addShape(newImageShape);
      sendCanvasOperation({ operation_type: 'CREATE', object: newImageShape });
      setSelectedShapeId(id);
      setSelectedTool('select');
      setShowImageImportModal(false);
      setImageUrlInput('');
      setImageUrlError(null);
      setToastMessage('Image imported successfully!');
      setTimeout(() => setToastMessage(null), 1800);
    };
    img.onerror = () => {
      setImageUrlError('Could not load image from this source. Please check the file or URL.');
      setToastMessage('Failed to load image');
      setTimeout(() => setToastMessage(null), 2400);
    };
    img.src = src;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const src = evt.target?.result as string;
        if (src) {
          importImage(src, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const zoomAt = (screenX: number, screenY: number, factor: number) => {
    setView((v) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const worldX = (screenX - v.x) / v.scale;
      const worldY = (screenY - v.y) / v.scale;
      return { scale: newScale, x: screenX - worldX * newScale, y: screenY - worldY * newScale };
    });
  };

  // ----- Wheel: plain scroll pans, ctrl/cmd+scroll (or trackpad pinch) zooms -----
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        zoomAt(screenX, screenY, Math.exp(-e.deltaY * 0.01));
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };

    svg.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  const zoomButton = (factor: number) => {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0;
    const cy = rect ? rect.height / 2 : 0;
    zoomAt(cx, cy, factor);
  };

  const fitToScreen = () => {
    fitToPage(activePageId);
  };

  const zoomToScale = (targetScale: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - view.x) / view.scale;
    const worldY = (cy - view.y) / view.scale;
    setView({
      scale: targetScale,
      x: Math.round(cx - worldX * targetScale),
      y: Math.round(cy - worldY * targetScale),
    });
    setShowZoomMenu(false);
  };

  const zoomToSelection = () => {
    const selected = shapes.find((s) => s.id === selectedShapeId);
    if (!selected) {
      fitToScreen();
      return;
    }
    const box = getShapeBBox(selected);
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pad = 120;
    const scale = Math.min((rect.width - pad) / Math.max(10, box.width), (rect.height - pad) / Math.max(10, box.height), 2.5);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const x = rect.width / 2 - cx * scale;
    const y = rect.height / 2 - cy * scale;
    setView({
      x: Math.round(x),
      y: Math.round(y),
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(scale * 100) / 100)),
    });
    setShowZoomMenu(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 80);
    return () => clearTimeout(timer);
  }, [leftSidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      fitToScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ----- Space key handler for Pan tool -----
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ----- Full Keyboard Control Suite -----
  const nudgeShape = (dx: number, dy: number) => {
    if (!selectedShapeId) return;
    const shape = shapes.find((s) => s.id === selectedShapeId);
    if (!shape) return;
    let updated: CanvasShape;
    if (shape.type === 'line') {
      updated = { ...shape, x: shape.x + dx, y: shape.y + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
    } else {
      updated = { ...shape, x: shape.x + dx, y: shape.y + dy };
    }
    updateShape(shape.id, updated);
    sendCanvasOperation({ operation_type: 'UPDATE', object: updated });
  };

  const duplicateShape = () => {
    if (!selectedShapeId) return;
    const shape = shapes.find((s) => s.id === selectedShapeId);
    if (!shape) return;
    const newId = crypto.randomUUID();
    const offset = 24;
    let cloned: CanvasShape;
    if (shape.type === 'line') {
      cloned = { ...shape, id: newId, x: shape.x + offset, y: shape.y + offset, x2: shape.x2 + offset, y2: shape.y2 + offset };
    } else {
      cloned = { ...shape, id: newId, x: shape.x + offset, y: shape.y + offset };
    }
    addShape(cloned);
    sendCanvasOperation({ operation_type: 'CREATE', object: cloned });
    setSelectedShapeId(newId);
    setToastMessage('Duplicated (Ctrl+D)');
    setTimeout(() => setToastMessage(null), 1400);
  };

  const copyShape = () => {
    if (!selectedShapeId) return;
    const shape = shapes.find((s) => s.id === selectedShapeId);
    if (!shape) return;
    clipboardRef.current = shape;
    setToastMessage('Copied (Ctrl+C)');
    setTimeout(() => setToastMessage(null), 1400);
  };

  const pasteShape = () => {
    if (!clipboardRef.current) return;
    const shape = clipboardRef.current;
    const newId = crypto.randomUUID();
    const offset = 24;
    let pasted: CanvasShape;
    if (shape.type === 'line') {
      pasted = { ...shape, id: newId, x: shape.x + offset, y: shape.y + offset, x2: shape.x2 + offset, y2: shape.y2 + offset };
    } else {
      pasted = { ...shape, id: newId, x: shape.x + offset, y: shape.y + offset };
    }
    addShape(pasted);
    sendCanvasOperation({ operation_type: 'CREATE', object: pasted });
    setSelectedShapeId(newId);
    setToastMessage('Pasted (Ctrl+V)');
    setTimeout(() => setToastMessage(null), 1400);
  };

  const deleteSelected = () => {
    if (!selectedShapeId) return;
    removeShape(selectedShapeId);
    sendCanvasOperation({ operation_type: 'DELETE', id: selectedShapeId });
    setSelectedShapeId(null);
    setToastMessage('Deleted');
    setTimeout(() => setToastMessage(null), 1400);
  };

  // Global Keyboard listener for full canvas & tool control
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // --- 1. Navigation & Zoom Shortcuts ---
      if (ctrlOrCmd && e.key === '0') {
        e.preventDefault();
        fitToScreen();
      } else if (ctrlOrCmd && e.key === '1') {
        e.preventDefault();
        zoomToScale(1.0);
      } else if (e.shiftKey && e.key === '2') {
        e.preventDefault();
        zoomToSelection();
      } else if (ctrlOrCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomButton(1.25);
      } else if (ctrlOrCmd && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomButton(0.8);
      }

      // --- 2. Object Manipulation Shortcuts ---
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeShape(0, e.shiftKey ? -10 : -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeShape(0, e.shiftKey ? 10 : 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeShape(e.shiftKey ? -10 : -1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeShape(e.shiftKey ? 10 : 1, 0);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (ctrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateShape();
      } else if (ctrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        copyShape();
      } else if (ctrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        pasteShape();
      } else if (ctrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (shapes.length > 0) setSelectedShapeId(shapes[shapes.length - 1].id);
      }

      // --- 3. Escape & Modal Controls ---
      else if (e.key === 'Escape') {
        setSelectedShapeId(null);
        setSelectedTool('select');
        setShowShapesDropdown(false);
        setShowIconLibrary(false);
        setShowRoomMenu(false);
        setShowZoomMenu(false);
        setShowShortcutsModal(false);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      }

      // --- 4. Tool Switching Shortcuts ---
      else if (!ctrlOrCmd && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') setSelectedTool('select');
        else if (e.key === 'r' || e.key === 'R') setSelectedTool('rectangle');
        else if (e.key === 'o' || e.key === 'O' || e.key === 'c' || e.key === 'C') setSelectedTool('circle');
        else if (e.key === 'l' || e.key === 'L') setSelectedTool('line');
        else if (e.key === 't' || e.key === 'T') setSelectedTool('text');
        else if (e.key === 's' || e.key === 'S') setShowShapesDropdown((v) => !v);
        else if (e.key === 'i' || e.key === 'I') setShowIconLibrary((v) => !v);
        else if (e.key === 'h' || e.key === 'H') setIsSpacePressed(true);
      } else if (ctrlOrCmd && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        setShowImageImportModal(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShapeId, shapes]);

  // Global clipboard listener for image pasting (e.g. screenshots, copied images)
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

    const handlePaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (evt) => {
              const src = evt.target?.result as string;
              if (src) {
                importImage(src, file.name || 'Pasted Image');
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ----- Creating new shapes (click, or drag to size) -----
  const handleBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      dragRef.current = {
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewX: view.x,
        startViewY: view.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (selectedTool === 'select') {
      setSelectedShapeId(null);
      return;
    }

    const { x, y } = getPoint(e);
    const id = crypto.randomUUID();

    if (selectedTool === 'icon' && pendingIconId) {
      const shape: IconShape = {
        id,
        type: 'icon',
        x,
        y,
        width: 0,
        height: 0,
        rotation: 0,
        iconId: pendingIconId,
        ...DEFAULT_APPEARANCE,
        strokeWidth: 2,
      };
      addShape(shape);
      dragRef.current = { kind: 'draw', shapeId: id, startX: x, startY: y };
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    if (selectedTool === 'text') {
      const text = window.prompt('Text content', 'Double-click to edit');
      if (!text) {
        setSelectedTool('select');
        return;
      }
      const shape: TextShape = {
        id,
        type: 'text',
        x,
        y,
        width: Math.max(80, text.length * 10),
        fontSize: 20,
        rotation: 0,
        text,
        ...DEFAULT_APPEARANCE,
      };
      addShape(shape);
      sendCanvasOperation({ operation_type: 'CREATE', object: shape });
      setSelectedShapeId(id);
      setSelectedTool('select');
      return;
    }

    let shape: CanvasShape;
    if (selectedTool === 'rectangle') {
      shape = { id, type: 'rectangle', x, y, width: 0, height: 0, rotation: 0, ...DEFAULT_APPEARANCE };
    } else if (selectedTool === 'circle') {
      shape = { id, type: 'circle', x, y, radius: 0, rotation: 0, ...DEFAULT_APPEARANCE };
    } else {
      shape = {
        id,
        type: 'line',
        x,
        y,
        x2: x,
        y2: y,
        rotation: 0,
        ...DEFAULT_APPEARANCE,
        strokeWidth: 3,
      };
    }

    addShape(shape);
    dragRef.current = { kind: 'draw', shapeId: id, startX: x, startY: y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // ----- Selecting / moving an existing page / artboard -----
  const handlePagePointerDown = (e: React.PointerEvent, page: CanvasPage) => {
    if (isSpacePressed || e.button === 1) return;
    e.stopPropagation();
    setActivePageId(page.id);
    setSelectedShapeId(null);

    if (selectedTool !== 'select') return;

    const { x, y } = getPoint(e);

    // Find all shapes positioned within or overlapping this page
    const pageShapes = shapes.filter(
      (s) =>
        s.x >= page.x - 30 &&
        s.x <= page.x + page.width + 30 &&
        s.y >= page.y - 30 &&
        s.y <= page.y + page.height + 30
    );

    dragRef.current = {
      kind: 'movePage',
      pageId: page.id,
      startX: x,
      startY: y,
      originPage: { ...page },
      originShapes: pageShapes.map((s) => ({ ...s })),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // ----- Selecting / moving an existing shape -----
  const handleShapePointerDown = (e: React.PointerEvent, shape: CanvasShape) => {
    if (shape.hidden) return;
    if (selectedTool !== 'select') return;
    e.stopPropagation();
    setSelectedShapeId(shape.id);
    if (shape.locked) return; // Locked shape can be selected, but cannot be dragged
    const { x, y } = getPoint(e);
    dragRef.current = { kind: 'move', shapeId: shape.id, startX: x, startY: y, origin: shape };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent, shape: CanvasShape, handle: string) => {
    if (shape.locked || shape.hidden) return;
    e.stopPropagation();
    const { x, y } = getPoint(e);
    dragRef.current = { kind: 'resize', shapeId: shape.id, handle, startX: x, startY: y, origin: shape };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleRotatePointerDown = (e: React.PointerEvent, shape: CanvasShape) => {
    if (shape.locked || shape.hidden) return;
    e.stopPropagation();
    const { x, y } = getPoint(e);
    const center = getShapeCenter(shape);
    const startAngle = (Math.atan2(y - center.y, x - center.x) * 180) / Math.PI;
    dragRef.current = {
      kind: 'rotate',
      shapeId: shape.id,
      centerX: center.x,
      centerY: center.y,
      startAngle,
      startRotation: shape.rotation,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // ----- Drag handling shared across draw / move / resize / rotate / movePage -----
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      setView((v) => ({ ...v, x: drag.startViewX + dx, y: drag.startViewY + dy }));
      return;
    }

    const { x, y } = getPoint(e);

    if (drag.kind === 'movePage') {
      const dx = Math.round(x - drag.startX);
      const dy = Math.round(y - drag.startY);
      const newX = drag.originPage.x + dx;
      const newY = drag.originPage.y + dy;

      updatePage(drag.pageId, { x: newX, y: newY });

      // Move shapes belonging to the page together in sync
      for (const originShape of drag.originShapes) {
        if (originShape.type === 'line') {
          updateShape(originShape.id, {
            x: originShape.x + dx,
            y: originShape.y + dy,
            x2: originShape.x2 + dx,
            y2: originShape.y2 + dy,
          });
        } else {
          updateShape(originShape.id, {
            x: originShape.x + dx,
            y: originShape.y + dy,
          });
        }
      }
      return;
    }

    if (drag.kind === 'draw') {
      const shape = shapes.find((s) => s.id === drag.shapeId);
      if (!shape) return;
      if (shape.type === 'rectangle' || shape.type === 'icon') {
        updateShape(shape.id, {
          x: Math.min(x, drag.startX),
          y: Math.min(y, drag.startY),
          width: Math.abs(x - drag.startX),
          height: Math.abs(y - drag.startY),
        });
      } else if (shape.type === 'circle') {
        updateShape(shape.id, { radius: Math.hypot(x - drag.startX, y - drag.startY) });
      } else if (shape.type === 'line') {
        updateShape(shape.id, { x2: x, y2: y });
      }
      return;
    }

    if (drag.kind === 'move') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      const origin = drag.origin;
      if (origin.type === 'line') {
        updateShape(origin.id, {
          x: origin.x + dx,
          y: origin.y + dy,
          x2: origin.x2 + dx,
          y2: origin.y2 + dy,
        });
      } else {
        updateShape(origin.id, { x: origin.x + dx, y: origin.y + dy });
      }
      return;
    }

    if (drag.kind === 'resize') {
      const origin = drag.origin;
      const rawDx = x - drag.startX;
      const rawDy = y - drag.startY;
      const { dx, dy } = toLocalDelta(rawDx, rawDy, origin.rotation);

      if (isBoxShape(origin)) {
        let ox = origin.x;
        let oy = origin.y;
        let width = origin.width;
        let height = shapeHeightOf(origin);

        if (drag.handle.includes('e')) width = Math.max(MIN_SIZE, origin.width + dx);
        if (drag.handle.includes('s')) height = Math.max(MIN_SIZE, height + dy);
        if (drag.handle.includes('w')) {
          width = Math.max(MIN_SIZE, origin.width - dx);
          ox = origin.x + (origin.width - width);
        }
        if (drag.handle.includes('n')) {
          const newHeight = Math.max(MIN_SIZE, height - dy);
          oy = origin.y + (height - newHeight);
          height = newHeight;
        }

        if (origin.type === 'rectangle' || origin.type === 'icon' || origin.type === 'image') {
          updateShape(origin.id, { x: ox, y: oy, width, height });
        } else if (origin.type === 'text') {
          const scale = height / Math.max(MIN_SIZE, shapeHeightOf(origin));
          updateShape(origin.id, { x: ox, y: oy, width, fontSize: Math.max(8, origin.fontSize * scale) });
        }
      } else if (origin.type === 'circle') {
        let r = origin.radius;
        if (drag.handle === 'e') r = Math.max(MIN_SIZE, origin.radius + rawDx);
        else if (drag.handle === 'w') r = Math.max(MIN_SIZE, origin.radius - rawDx);
        else if (drag.handle === 's') r = Math.max(MIN_SIZE, origin.radius + rawDy);
        else if (drag.handle === 'n') r = Math.max(MIN_SIZE, origin.radius - rawDy);
        else r = Math.max(MIN_SIZE, origin.radius + rawDx);
        updateShape(origin.id, { radius: r });
      } else if (origin.type === 'line') {
        if (drag.handle === 'start') {
          updateShape(origin.id, { x: origin.x + rawDx, y: origin.y + rawDy });
        } else {
          updateShape(origin.id, { x2: origin.x2 + rawDx, y2: origin.y2 + rawDy });
        }
      }
      return;
    }

    if (drag.kind === 'rotate') {
      const angle = (Math.atan2(y - drag.centerY, x - drag.centerX) * 180) / Math.PI;
      updateShape(drag.shapeId, { rotation: drag.startRotation + (angle - drag.startAngle) });
    }
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    if (drag.kind === 'movePage') {
      const pageId = drag.pageId;
      const finalPage = useRoomStore.getState().pages.find((p) => p.id === pageId);
      if (finalPage) {
        sendCanvasOperation({
          operation_type: 'PAGE_UPDATE',
          page: finalPage,
        });
      }
      if (drag.originShapes.length > 0) {
        const currentShapes = useRoomStore.getState().shapes;
        sendCanvasOperation({
          operation_type: 'REORDER',
          shapes: currentShapes,
        });
      }
      return;
    }

    const shapeId = 'shapeId' in drag ? drag.shapeId : undefined;
    const finalShape = shapes.find((s) => s.id === shapeId);
    if (!finalShape) return;

    if (drag.kind === 'draw') {
      // A plain click (no real drag) still produces a usable default-sized shape.
      if ((finalShape.type === 'rectangle' || finalShape.type === 'image') && (finalShape.width < MIN_SIZE || finalShape.height < MIN_SIZE)) {
        updateShape(finalShape.id, { x: drag.startX - 60, y: drag.startY - 40, width: 120, height: 80 });
      } else if (finalShape.type === 'icon' && (finalShape.width < MIN_SIZE || finalShape.height < MIN_SIZE)) {
        updateShape(finalShape.id, { x: drag.startX - 28, y: drag.startY - 28, width: 56, height: 56 });
      } else if (finalShape.type === 'circle' && finalShape.radius < MIN_SIZE) {
        updateShape(finalShape.id, { radius: 50 });
      }
      const shapeToSend = shapes.find((s) => s.id === finalShape.id) || finalShape;
      sendCanvasOperation({ operation_type: 'CREATE', object: shapeToSend });
      setSelectedShapeId(finalShape.id);
      setSelectedTool('select');
    } else {
      sendCanvasOperation({ operation_type: 'UPDATE', object: finalShape });
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const worldPoint = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    // 1. Image files dropped from desktop / file explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const src = evt.target?.result as string;
            if (src) {
              importImage(src, file.name, { x: worldPoint.x + i * 24, y: worldPoint.y + i * 24 });
            }
          };
          reader.readAsDataURL(file);
        }
      }
      return;
    }

    // 2. Dragged image URL from browser
    const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (textData && (textData.startsWith('http://') || textData.startsWith('https://') || textData.startsWith('data:image/'))) {
      if (textData.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || textData.startsWith('data:image/')) {
        importImage(textData, 'Web Image', worldPoint);
        return;
      }
    }

    // 3. Sticker / Shape icon drop
    let iconId = e.dataTransfer.getData('text/plain');
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        if (parsed.iconId) iconId = parsed.iconId;
      } catch {
        // fallback to text/plain
      }
    }

    if (!iconId) return;

    const size = 56;
    const newShape: IconShape = {
      id: crypto.randomUUID(),
      type: 'icon',
      x: Math.round(worldPoint.x - size / 2),
      y: Math.round(worldPoint.y - size / 2),
      width: size,
      height: size,
      rotation: 0,
      iconId,
      ...DEFAULT_APPEARANCE,
      strokeWidth: 2,
    };

    addShape(newShape);
    sendCanvasOperation({ operation_type: 'CREATE', object: newShape });
    setSelectedShapeId(newShape.id);
    setSelectedTool('select');
    setRecentIconIds((prev) => [iconId, ...prev.filter((id) => id !== iconId)].slice(0, 9));
  };

  const clearCanvas = () => {
    clearShapes();
    setSelectedShapeId(null);
    sendCanvasOperation({ operation_type: 'CLEAR' });
  };

  const deleteLayer = (id: string) => {
    removeShape(id);
    sendCanvasOperation({ operation_type: 'DELETE', id });
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  // ----- Properties panel wiring -----
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) ?? null;

  const handlePropertiesChange = (patch: Partial<CanvasShape>) => {
    if (!selectedShapeId) return;
    updateShape(selectedShapeId, patch);
    const updated = { ...shapes.find((s) => s.id === selectedShapeId), ...patch } as CanvasShape;
    sendCanvasOperation({ operation_type: 'UPDATE', object: updated });
  };

  // ----- Export -----
  const exportCanvasPNG = () => {
    const svg = svgRef.current;
    if (!svg || shapes.length === 0) return;

    const bbox = getUnionBBox(shapes);
    const defs = svg.querySelector('defs');
    const defsMarkup = defs ? new XMLSerializer().serializeToString(defs) : '';
    const nodesMarkup = shapes
      .map((s) => {
        const node = svg.querySelector(`[data-shape-id="${s.id}"]`);
        return node ? new XMLSerializer().serializeToString(node) : '';
      })
      .join('');

    const svgString =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" ` +
      `viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}">${defsMarkup}${nodesMarkup}</svg>`;

    rasterizeSvgToPng(svgString, bbox.width, bbox.height, 'canvas.png');
  };

  const buildSelectionSvgString = (): { svgString: string; width: number; height: number } | null => {
    const svg = svgRef.current;
    if (!svg || !selectedShape) return null;
    const node = svg.querySelector(`[data-shape-id="${selectedShape.id}"]`);
    if (!node) return null;

    const bbox = getShapeBBox(selectedShape);
    const defs = svg.querySelector('defs');
    const defsMarkup = defs ? new XMLSerializer().serializeToString(defs) : '';
    const nodeMarkup = new XMLSerializer().serializeToString(node);

    const svgString =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" ` +
      `viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}">${defsMarkup}${nodeMarkup}</svg>`;

    return { svgString, width: bbox.width, height: bbox.height };
  };

  const exportSelectionPNG = () => {
    const built = buildSelectionSvgString();
    if (!built) return;
    rasterizeSvgToPng(built.svgString, built.width, built.height, 'shape.png');
  };

  const exportSelectionSVG = () => {
    const built = buildSelectionSvgString();
    if (!built) return;
    downloadBlob(built.svgString, 'shape.svg', 'image/svg+xml');
  };

  // ----- Rendering -----
  const renderHandles = (shape: CanvasShape) => {
    if (shape.id !== selectedShapeId || shape.locked || shape.hidden) return null;

    // Handles live inside the pan/zoomed <g>, but should always *look* like
    // a fixed number of screen pixels, so divide every on-screen constant
    // by the current zoom level.
    const inv = 1 / view.scale;
    const handleSize = HANDLE_SIZE * inv;
    const strokeW = 1.5 * inv;
    const rotateOffset = 28 * inv;

    if (isBoxShape(shape)) {
      const height = shapeHeightOf(shape);
      // Icon/text glyphs sit flush with their bounding box, so pad the
      // handle positions outward a touch to keep anchors off the artwork.
      const pad = shape.type === 'icon' || shape.type === 'text' ? 4 * inv : 0;
      const corners: Record<string, { x: number; y: number }> = {
        nw: { x: shape.x - pad, y: shape.y - pad },
        ne: { x: shape.x + shape.width + pad, y: shape.y - pad },
        sw: { x: shape.x - pad, y: shape.y + height + pad },
        se: { x: shape.x + shape.width + pad, y: shape.y + height + pad },
      };
      const center = getShapeCenter(shape);
      return (
        <g>
          {Object.entries(corners).map(([key, pos]) => (
            <rect
              key={key}
              x={pos.x - handleSize / 2}
              y={pos.y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#0F172A"
              stroke="#818CF8"
              strokeWidth={strokeW * 1.2}
              rx={1.5 * inv}
              style={{ cursor: `${key}-resize` }}
              onPointerDown={(e) => handleResizePointerDown(e, shape, key)}
            />
          ))}
          <line
            x1={center.x}
            y1={shape.y - pad}
            x2={center.x}
            y2={shape.y - pad - rotateOffset}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth={inv}
            strokeDasharray={`${2 * inv} ${2 * inv}`}
          />
          <circle
            cx={center.x}
            cy={shape.y - pad - rotateOffset}
            r={handleSize / 2}
            fill="#0F172A"
            stroke="#818CF8"
            strokeWidth={strokeW * 1.2}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => handleRotatePointerDown(e, shape)}
          />
        </g>
      );
    }

    if (shape.type === 'circle') {
      const handles = [
        { handle: 'e', cx: shape.x + shape.radius, cy: shape.y, cursor: 'ew-resize' },
        { handle: 'w', cx: shape.x - shape.radius, cy: shape.y, cursor: 'ew-resize' },
        { handle: 's', cx: shape.x, cy: shape.y + shape.radius, cursor: 'ns-resize' },
        { handle: 'n', cx: shape.x, cy: shape.y - shape.radius, cursor: 'ns-resize' },
      ];
      return (
        <g>
          {handles.map((h) => (
            <circle
              key={h.handle}
              cx={h.cx}
              cy={h.cy}
              r={handleSize / 2}
              fill="#FFFFFF"
              stroke="#6366F1"
              strokeWidth={strokeW * 1.5}
              style={{ cursor: h.cursor }}
              onPointerDown={(e) => handleResizePointerDown(e, shape, h.handle)}
            />
          ))}
        </g>
      );
    }

    if (shape.type === 'line') {
      return (
        <>
          <circle
            cx={shape.x}
            cy={shape.y}
            r={handleSize / 2}
            fill="#0F172A"
            stroke="#818CF8"
            strokeWidth={strokeW * 1.2}
            style={{ cursor: 'move' }}
            onPointerDown={(e) => handleResizePointerDown(e, shape, 'start')}
          />
          <circle
            cx={shape.x2}
            cy={shape.y2}
            r={handleSize / 2}
            fill="#0F172A"
            stroke="#818CF8"
            strokeWidth={strokeW * 1.2}
            style={{ cursor: 'move' }}
            onPointerDown={(e) => handleResizePointerDown(e, shape, 'end')}
          />
        </>
      );
    }

    return null;
  };

  // Selection outline is drawn as its own overlay, separate from the
  // shape's real stroke, so setting a Stroke color/width in the
  // properties panel never fights with the "you have this selected" cue.
  const renderSelectionOutline = (shape: CanvasShape) => {
    if (shape.id !== selectedShapeId) return null;
    const inv = 1 / view.scale;
    const outline = {
      stroke: '#818CF8',
      strokeWidth: 2 * inv,
      strokeDasharray: `${5 * inv} ${3.5 * inv}`,
      fill: 'none',
      pointerEvents: 'none' as const,
    };

    if (shape.type === 'rectangle' || shape.type === 'image') {
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...outline} />;
    }
    if (shape.type === 'circle') {
      return <circle cx={shape.x} cy={shape.y} r={shape.radius} {...outline} />;
    }
    if (shape.type === 'text' || shape.type === 'icon') {
      const pad = 4 * inv;
      return (
        <rect
          x={shape.x - pad}
          y={shape.y - pad}
          width={shape.width + pad * 2}
          height={shapeHeightOf(shape) + pad * 2}
          {...outline}
        />
      );
    }
    return null;
  };

  const shapeFilterId = (id: string) => `cs-filter-${id}`;

  const renderShape = (shape: CanvasShape) => {
    if (shape.hidden) return null;
    const cursor = shape.locked ? 'default' : (selectedTool === 'select' ? 'move' : 'default');
    const opacity = shape.opacity ?? 1;
    const hasFilter = (shape.shadow?.enabled || (shape.blur ?? 0) > 0);

    const body = (() => {
      if (shape.type === 'rectangle') {
        return (
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill ?? '#3654F4'}
            fillOpacity={shape.fillOpacity ?? 1}
            stroke={(shape.strokeWidth ?? 0) > 0 ? shape.stroke ?? '#1F2937' : 'none'}
            strokeWidth={shape.strokeWidth ?? 0}
            strokeOpacity={shape.strokeOpacity ?? 1}
            onPointerDown={(e) => handleShapePointerDown(e, shape)}
            style={{ cursor }}
          />
        );
      }
      if (shape.type === 'circle') {
        return (
          <circle
            cx={shape.x}
            cy={shape.y}
            r={shape.radius}
            fill={shape.fill ?? '#3654F4'}
            fillOpacity={shape.fillOpacity ?? 1}
            stroke={(shape.strokeWidth ?? 0) > 0 ? shape.stroke ?? '#1F2937' : 'none'}
            strokeWidth={shape.strokeWidth ?? 0}
            strokeOpacity={shape.strokeOpacity ?? 1}
            onPointerDown={(e) => handleShapePointerDown(e, shape)}
            style={{ cursor }}
          />
        );
      }
      if (shape.type === 'line') {
        return (
          <line
            x1={shape.x}
            y1={shape.y}
            x2={shape.x2}
            y2={shape.y2}
            stroke={shape.stroke ?? '#1F2937'}
            strokeWidth={shape.strokeWidth ?? 3}
            strokeOpacity={shape.strokeOpacity ?? 1}
            onPointerDown={(e) => handleShapePointerDown(e, shape)}
            style={{ cursor }}
          />
        );
      }
      if (shape.type === 'text') {
        return (
          <text
            x={shape.x}
            y={shape.y + shape.fontSize}
            fontSize={shape.fontSize}
            fill={shape.fill ?? '#FFFFFF'}
            fillOpacity={shape.fillOpacity ?? 1}
            onPointerDown={(e) => handleShapePointerDown(e, shape)}
            style={{ cursor, userSelect: 'none' }}
          >
            {shape.text}
          </text>
        );
      }

      if (shape.type === 'image') {
        return (
          <g onPointerDown={(e) => handleShapePointerDown(e, shape)} style={{ cursor }}>
            <image
              href={shape.src}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              preserveAspectRatio="none"
              style={{ pointerEvents: 'auto', userSelect: 'none' }}
            />
            {(shape.strokeWidth ?? 0) > 0 && (
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill="none"
                stroke={shape.stroke ?? '#1F2937'}
                strokeWidth={shape.strokeWidth ?? 0}
                strokeOpacity={shape.strokeOpacity ?? 1}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      }

      // icon
      const iconDef = findShapeDef(shape.iconId);
      return (
        <g onPointerDown={(e) => handleShapePointerDown(e, shape)} style={{ cursor }}>
          {/* invisible hit area so empty space inside the icon's box is still draggable */}
          <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill="transparent" />
          {iconDef && (
            <svg
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              viewBox="0 0 24 24"
              fill="none"
              stroke={shape.stroke ?? '#FFFFFF'}
              strokeOpacity={shape.strokeOpacity ?? 1}
              strokeWidth={shape.strokeWidth ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            >
              {iconDef.els.map((p, i) => (
                <IconPrimitiveEl key={i} p={p} />
              ))}
            </svg>
          )}
        </g>
      );
    })();

    const center = getShapeCenter(shape);
    const rotation = isBoxShape(shape) ? shape.rotation : 0;

    return (
      <g
        key={shape.id}
        data-shape-id={shape.id}
        transform={`rotate(${rotation} ${center.x} ${center.y})`}
        opacity={opacity}
        filter={hasFilter ? `url(#${shapeFilterId(shape.id)})` : undefined}
      >
        {body}
        {renderSelectionOutline(shape)}
        {renderHandles(shape)}
      </g>
    );
  };

  // Dot grid that lives in screen space (outside the pan/zoom group) but is
  // offset/scaled to track the viewport, giving the illusion of an
  // infinite world underneath the shapes.
  const renderGridBackground = () => {
    const cell = GRID_SIZE * view.scale;
    const offsetX = ((view.x % cell) + cell) % cell;
    const offsetY = ((view.y % cell) + cell) % cell;
    const isLight =
      theme === 'light' ||
      (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
    const dotFill = isLight ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.12)';

    return (
      <>
        <defs>
          <pattern id="cs-grid-dots" width={cell} height={cell} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
            <circle cx={1} cy={1} r={Math.min(1.4, 1 * view.scale + 0.4)} fill={dotFill} />
          </pattern>
        </defs>
        <rect x={0} y={0} width="100%" height="100%" fill="url(#cs-grid-dots)" />
      </>
    );
  };

  // Per-shape SVG filters for shadow / blur, only generated for shapes
  // that actually use them.
  const renderFilterDefs = () => (
    <defs>
      {shapes
        .filter((s) => s.shadow?.enabled || (s.blur ?? 0) > 0)
        .map((s) => (
          <filter
            key={s.id}
            id={shapeFilterId(s.id)}
            x="-75%"
            y="-75%"
            width="250%"
            height="250%"
          >
            {(s.blur ?? 0) > 0 && <feGaussianBlur in="SourceGraphic" stdDeviation={s.blur} result="blurred" />}
            {s.shadow?.enabled && (
              <feDropShadow
                in={(s.blur ?? 0) > 0 ? 'blurred' : 'SourceGraphic'}
                dx={s.shadow.offsetX}
                dy={s.shadow.offsetY}
                stdDeviation={s.shadow.blur}
                floodColor={s.shadow.color}
              />
            )}
          </filter>
        ))}
    </defs>
  );

  return (
    <div className="cs-room-shell">
      {/* Profile & Settings Sliding Drawer (50%–75% width) */}
      <ProfileDrawer />

      {/* Ambient background glow */}
      <div className="cs-bento-bg-mesh" style={{ opacity: 0.18 }}>
        <div className="cs-mesh-orb cs-orb-1" style={{ width: 450, height: 450 }} />
        <div className="cs-mesh-orb cs-orb-2" style={{ width: 400, height: 400 }} />
      </div>

      {/* Top Floating Glass Header */}
      <header className="cs-room-header">
        {/* Left: Home/Back + Sidebar toggle + Room info */}
        <div className="cs-room-header-left">
          <button
            className="cs-room-nav-btn"
            onClick={() => navigate('/dashboard')}
            title="Back to Studio Dashboard"
            aria-label="Back to Studio Dashboard"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            className={`cs-room-nav-btn ${leftSidebarOpen ? 'is-active' : ''}`}
            onClick={() => setLeftSidebarOpen((v) => !v)}
            title="Toggle Layers & Assets"
            aria-label="Toggle Layers & Assets"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>

          <div className="cs-header-vert-divider" />

          <div className="cs-room-title-wrapper" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`cs-room-title-trigger ${showRoomMenu ? 'is-active' : ''}`}
              onClick={() => setShowRoomMenu((v) => !v)}
              title="Board options & Room details"
            >
              <div className="cs-room-title-row">
                <span className={`cs-title-dot ${isPersonalWorkspace ? 'dot-personal' : 'dot-collab'}`} />
                <h2 className="cs-room-name">
                  {isPersonalWorkspace ? 'Personal Workspace' : 'Collaborative Board'}
                </h2>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cs-chevron-icon">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {showRoomMenu && (
              <div className="cs-room-meta-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="cs-dropdown-section-title">Board Overview</div>
                <div className="cs-room-meta-row">
                  <span className="cs-meta-label">Workspace:</span>
                  <span className="cs-meta-value">{isPersonalWorkspace ? 'Personal Workspace' : 'Collaborative Live Room'}</span>
                </div>
                {!isPersonalWorkspace && roomId && (
                  <div className="cs-room-meta-row" style={{ marginTop: 8 }}>
                    <span className="cs-meta-label">Room ID:</span>
                    <div className="cs-room-id-chip-row">
                      <code className="cs-room-id-code">{roomId.length > 16 ? `${roomId.slice(0, 14)}…` : roomId}</code>
                      <button
                        type="button"
                        className="cs-copy-id-btn"
                        onClick={() => {
                          handleCopyRoomId();
                        }}
                        title="Copy full Room ID"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy ID</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="cs-menu-divider" />
                {!isPersonalWorkspace ? (
                  <button
                    type="button"
                    className="cs-dropdown-action-item"
                    onClick={() => {
                      setRightTab('room');
                      setShowRoomMenu(false);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    <span>Manage Collaborators ({activeUsers.length + members.length})</span>
                  </button>
                ) : (
                  <div className="cs-dropdown-note">
                    🔒 Private Studio · Only you can view this board.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Streamlined Floating Tool Dock */}
        <div className="cs-room-toolbar-dock">
          {/* 1. Select / Pointer */}
          <button
            className={`cs-tool-item ${selectedTool === 'select' ? 'is-active' : ''}`}
            title="Select tool (V)"
            onClick={() => setSelectedTool('select')}
          >
            <IconGlyph els={TOOLBAR_ICONS.select} />
          </button>

          {/* 2. Rectangle */}
          <button
            className={`cs-tool-item ${selectedTool === 'rectangle' ? 'is-active' : ''}`}
            title="Rectangle (R)"
            onClick={() => setSelectedTool('rectangle')}
          >
            <IconGlyph els={TOOLBAR_ICONS.rectangle} />
          </button>

          {/* 3. Circle */}
          <button
            className={`cs-tool-item ${selectedTool === 'circle' ? 'is-active' : ''}`}
            title="Circle (O)"
            onClick={() => setSelectedTool('circle')}
          >
            <IconGlyph els={TOOLBAR_ICONS.circle} />
          </button>

          {/* 4. Straight Line */}
          <button
            className={`cs-tool-item ${selectedTool === 'line' ? 'is-active' : ''}`}
            title="Straight Line (L)"
            onClick={() => setSelectedTool('line')}
          >
            <IconGlyph els={TOOLBAR_ICONS.line} />
          </button>

          {/* 5. Text */}
          <button
            className={`cs-tool-item ${selectedTool === 'text' ? 'is-active' : ''}`}
            title="Text tool (T)"
            onClick={() => setSelectedTool('text')}
          >
            <IconGlyph els={TOOLBAR_ICONS.text} />
          </button>

          <span className="cs-dock-divider" />

          {/* 6. Quick Shapes Dropdown Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className={`cs-tool-item cs-tool-dropdown-trigger ${showShapesDropdown || (selectedTool === 'icon' && pendingIconId?.startsWith('sh')) ? 'is-active' : ''}`}
              title="Quick Shapes Gallery (S)"
              onClick={() => {
                setShowShapesDropdown((v) => !v);
                setShowIconLibrary(false);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showShapesDropdown && (
              <div className="cs-shapes-dropdown-popover">
                <div className="cs-popover-header">
                  <span>Quick Shapes Gallery</span>
                  <button type="button" onClick={() => setShowShapesDropdown(false)}>✕</button>
                </div>
                <div className="cs-shapes-popover-grid">
                  {HEADER_SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', shape.id);
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'icon', iconId: shape.id }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`cs-shape-grid-btn ${selectedTool === 'icon' && pendingIconId === shape.id ? 'is-active' : ''}`}
                      title={`${shape.label} (Drag or click)`}
                      onClick={() => {
                        setPendingIconId(shape.id);
                        setSelectedTool('icon');
                        setShowShapesDropdown(false);
                        setRecentIconIds((prev) => [shape.id, ...prev.filter((id) => id !== shape.id)].slice(0, 12));
                      }}
                    >
                      <IconGlyph els={shape.els} size={18} />
                      <span>{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 7. Full Icons & Stickers Library Trigger */}
          <button
            className={`cs-tool-item ${showIconLibrary ? 'is-active' : ''}`}
            title="Full Stickers & Shapes Library (I)"
            onClick={() => {
              setShowIconLibrary(true);
              setShowShapesDropdown(false);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>

          <span className="cs-dock-divider" />

          {/* 8. Import Image Button */}
          <div style={{ position: 'relative' }}>
            <button
              className="cs-tool-item"
              title="Import Image (Upload file, paste URL, or drag & drop)"
              onClick={() => {
                setShowImageImportModal(true);
                setShowShapesDropdown(false);
                setShowIconLibrary(false);
              }}
            >
              <IconGlyph els={TOOLBAR_ICONS.image ?? []} />
            </button>
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          <span className="cs-dock-divider" />

          {/* 9. Clear Canvas */}
          <button className="cs-tool-item is-danger" title="Clear entire canvas" onClick={clearCanvas}>
            <IconGlyph els={TOOLBAR_ICONS.trash} />
          </button>
        </div>

        {/* Right: Collaborator Avatars + Share Button + Zoom + Live Status */}
        <div className="cs-room-header-right">
          {/* Active collaborator avatar stack */}
          {activeUsers.length > 0 && (
            <div className="cs-avatar-stack" title={`${activeUsers.length} collaborator(s) online`}>
              {activeUsers.slice(0, 3).map((u) => (
                <div
                  key={u.user_id}
                  className="cs-avatar-bubble"
                  style={{ background: getAvatarBg(u.user_id) }}
                  title={u.username || u.email}
                >
                  {getInitials(u.username || u.email)}
                </div>
              ))}
              {activeUsers.length > 3 && (
                <div className="cs-avatar-bubble" style={{ background: '#475569' }}>
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Figma Share button */}
          {!isPersonalWorkspace && (
            <button
              className="cs-room-share-btn"
              onClick={() => setRightTab('room')}
              title="Invite collaborators & manage permissions"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Share</span>
            </button>
          )}

          {/* Zoom controls capsule with Presets Menu */}
          <div className="cs-zoom-capsule" style={{ position: 'relative' }}>
            <button className="cs-zoom-btn" title="Zoom out (Ctrl -)" onClick={() => zoomButton(0.8)}>
              −
            </button>
            <button
              className="cs-zoom-fit-btn"
              title="Fit Board to Screen (Ctrl+0)"
              onClick={fitToScreen}
            >
              Fit
            </button>
            <button
              className="cs-zoom-readout"
              title="Click for Zoom Presets"
              onClick={() => setShowZoomMenu((v) => !v)}
            >
              <span>{Math.round(view.scale * 100)}%</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 3 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button className="cs-zoom-btn" title="Zoom in (Ctrl +)" onClick={() => zoomButton(1.25)}>
              +
            </button>

            {showZoomMenu && (
              <div className="cs-zoom-dropdown-menu">
                <button type="button" onClick={() => { fitToScreen(); setShowZoomMenu(false); }}>
                  <span>Fit Board to Screen</span>
                  <kbd className="cs-kbd">Ctrl+0</kbd>
                </button>
                <button type="button" onClick={zoomToSelection}>
                  <span>Zoom to Selection</span>
                  <kbd className="cs-kbd">Shift+2</kbd>
                </button>
                <div className="cs-menu-divider" />
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={Math.round(view.scale * 100) === Math.round(s * 100) ? 'is-active' : ''}
                    onClick={() => zoomToScale(s)}
                  >
                    <span>{Math.round(s * 100)}%{s === 1.0 ? ' (Actual size)' : ''}</span>
                    {Math.round(view.scale * 100) === Math.round(s * 100) && <span style={{ color: '#818CF8' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live indicator pill */}
          <div className={`cs-room-status-pill ${connected ? 'is-live' : 'is-offline'}`}>
            <span className="cs-status-dot" />
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Toggle Properties/Room Panel button */}
          <button
            type="button"
            className={`cs-room-nav-btn ${rightSidebarOpen ? 'is-active' : ''}`}
            onClick={() => setRightSidebarOpen((v) => !v)}
            title="Toggle Properties & Design Panel"
            aria-label="Toggle Properties & Design Panel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>

          {/* User Profile & Settings Drawer Trigger */}
          <button
            type="button"
            className="cs-drawer-icon-btn"
            onClick={() => openDrawer('account')}
            title="Profile & Settings (50%–75% drawer)"
            style={{ width: '32px', height: '32px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="cs-room-body">
        {/* Left Layers Sidebar — Smoothly Animated (Figma style) */}
        <LayersPanel
          isOpen={leftSidebarOpen}
          shapes={shapes}
          pages={pages}
          activePageId={activePageId}
          selectedShapeId={selectedShapeId}
          onSelectShape={(id) => setSelectedShapeId(id)}
          onDeleteShape={(id) => deleteLayer(id)}
          onRenameShape={handleRenameLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onCollapse={() => setLeftSidebarOpen(false)}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onFocusPage={(pageId) => fitToPage(pageId)}
        />

        {/* Canvas Area */}
        <main className="cs-room-canvas-area">
          <svg
            ref={svgRef}
            className="cs-canvas-surface"
            style={{
              cursor: isSpacePressed
                ? dragRef.current?.kind === 'pan'
                  ? 'grabbing'
                  : 'grab'
                : selectedTool !== 'select'
                ? 'crosshair'
                : 'default',
            }}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            {/* Global SVG defs for artboard shadows and subtle grids */}
            <defs>
              <filter id="cs-board-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="20" stdDeviation="32" floodColor="#000000" floodOpacity="0.55" />
                <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#000000" floodOpacity="0.3" />
              </filter>
              <pattern id="cs-paper-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1.1" fill="#E2E8F0" />
              </pattern>
            </defs>

            {/* Ambient infinite dark dot grid */}
            {renderGridBackground()}

            {/* Scalable Canva Artboard & Shapes Layer */}
            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
              {renderFilterDefs()}

              {/* Render Every Page / Artboard on the Infinite Canvas */}
              {pages.map((page, pageIdx) => {
                const isActive = page.id === activePageId;
                const isDraggingThisPage = dragRef.current?.kind === 'movePage' && (dragRef.current as any).pageId === page.id;
                const headerWidth = Math.min(page.width, 400);

                return (
                  <g key={page.id} className={`cs-canvas-page-artboard-group ${isActive ? 'is-active-artboard' : ''}`}>
                    {/* Draggable Figma/Canva Style Artboard Header Bar */}
                    <g
                      transform={`translate(${page.x}, ${page.y - 44})`}
                      className="cs-canvas-page-header"
                      style={{ cursor: isDraggingThisPage ? 'grabbing' : 'grab' }}
                      onPointerDown={(e) => handlePagePointerDown(e, page)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        fitToPage(page.id);
                      }}
                    >
                      {/* Header pill background */}
                      <rect
                        x={0}
                        y={0}
                        width={headerWidth}
                        height={34}
                        rx={8}
                        fill={isActive ? '#1E2235' : '#121622'}
                        stroke={isActive ? '#6366F1' : '#272E44'}
                        strokeWidth={isActive ? 1.5 : 1}
                        style={{ filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))' }}
                      />

                      {/* 6-dot Drag grip handle */}
                      <g fill={isActive ? '#818CF8' : '#64748B'} transform="translate(10, 8)">
                        <circle cx="2" cy="3" r="1.5" />
                        <circle cx="2" cy="9" r="1.5" />
                        <circle cx="2" cy="15" r="1.5" />
                        <circle cx="7" cy="3" r="1.5" />
                        <circle cx="7" cy="9" r="1.5" />
                        <circle cx="7" cy="15" r="1.5" />
                      </g>

                      {/* Page Title & Number */}
                      <text
                        x={28}
                        y={21}
                        fill={isActive ? '#FFFFFF' : '#CBD5E1'}
                        fontSize={12.5}
                        fontWeight={700}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        Page {pageIdx + 1}: {page.name || `Page ${pageIdx + 1}`}
                      </text>

                      {/* Drag Hint & Dimensions */}
                      <text
                        x={headerWidth - 12}
                        y={21}
                        textAnchor="end"
                        fill={isActive ? '#818CF8' : '#64748B'}
                        fontSize={11}
                        fontWeight={600}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {page.width} × {page.height} px • ⠿ Move
                      </text>
                    </g>

                    {/* Canva Whiteboard Paper Surface with realistic soft shadow */}
                    <rect
                      x={page.x}
                      y={page.y}
                      width={page.width}
                      height={page.height}
                      rx={10}
                      fill={page.backgroundColor || '#FFFFFF'}
                      stroke={isActive ? '#6366F1' : 'rgba(0, 0, 0, 0.12)'}
                      strokeWidth={isActive ? 2.5 : 1}
                      filter="url(#cs-board-shadow)"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActivePageId(page.id)}
                    />
                    {/* Subtle paper dot grid inside whiteboard */}
                    <rect
                      x={page.x}
                      y={page.y}
                      width={page.width}
                      height={page.height}
                      rx={10}
                      fill="url(#cs-paper-grid)"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}

              {/* Shapes & Objects */}
              {shapes.map(renderShape)}
            </g>
          </svg>

          {/* Floating Canva Multi-Page Management Dock */}
          <div className="cs-pages-nav-dock">
            <button
              type="button"
              className="cs-page-nav-btn"
              disabled={activePageIndex <= 0}
              onClick={goToPrevPage}
              title="Previous Page"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="cs-page-indicator-pill" title="Active Page">
              <span>Page <strong>{activePageIndex + 1}</strong> of {pages.length}</span>
            </div>

            <button
              type="button"
              className="cs-page-nav-btn"
              disabled={activePageIndex >= pages.length - 1}
              onClick={goToNextPage}
              title="Next Page"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div className="cs-page-nav-divider" />

            <button
              type="button"
              className="cs-add-page-pill-btn"
              onClick={handleAddPage}
              title="Add a new page artboard (+)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Page</span>
            </button>

            <button
              type="button"
              className="cs-page-dock-icon-btn"
              onClick={() => handleDuplicatePage(activePageId)}
              title="Duplicate current page"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>

            {pages.length > 1 && (
              <button
                type="button"
                className="cs-page-dock-icon-btn is-danger"
                onClick={() => handleDeletePage(activePageId)}
                title="Delete current page"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>

          {/* Compact Canvas Viewport shortcut HUD */}
          <div className="cs-canvas-hud-left">
            <span><strong>Space + Drag</strong> pan</span>
            <span className="cs-hud-sep">•</span>
            <span><strong>Scroll</strong> zoom</span>
            <span className="cs-hud-sep">•</span>
            <span><strong>Ctrl+0</strong> fit</span>
            <span className="cs-hud-sep">•</span>
            <button
              type="button"
              className="cs-hud-shortcuts-btn"
              onClick={() => setShowShortcutsModal(true)}
              title="View Keyboard Shortcuts (?)"
            >
              <span>Shortcuts</span>
              <kbd>?</kbd>
            </button>
          </div>

          {/* Full Icons & Stickers Library Modal with Backdrop */}
          {showIconLibrary && (
            <div className="cs-modal-backdrop" onClick={() => setShowIconLibrary(false)}>
              <IconLibraryPanel
                recentIconIds={recentIconIds}
                onPick={(icon: IconDef) => {
                  setPendingIconId(icon.id);
                  setSelectedTool('icon');
                  setShowIconLibrary(false);
                  setRecentIconIds((prev) => [icon.id, ...prev.filter((id) => id !== icon.id)].slice(0, 12));
                }}
                onClose={() => setShowIconLibrary(false)}
              />
            </div>
          )}

          {/* Keyboard Shortcuts Cheat Sheet Modal */}
          {showShortcutsModal && (
            <div className="cs-modal-backdrop" onClick={() => setShowShortcutsModal(false)}>
              <div className="cs-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cs-modal-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="8" x2="6" y2="8" />
                      <line x1="10" y1="8" x2="10" y2="8" />
                      <line x1="14" y1="8" x2="14" y2="8" />
                      <line x1="18" y1="8" x2="18" y2="8" />
                      <line x1="6" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="18" y2="12" />
                      <line x1="7" y1="16" x2="17" y2="16" />
                    </svg>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Keyboard Shortcuts</span>
                  </div>
                  <button type="button" className="cs-modal-close" onClick={() => setShowShortcutsModal(false)}>✕</button>
                </div>

                <div className="cs-shortcuts-sections-grid">
                  <div className="cs-shortcut-category">
                    <span className="cs-shortcut-cat-title">Tools</span>
                    <div className="cs-shortcut-row"><kbd>V</kbd><span>Select Tool</span></div>
                    <div className="cs-shortcut-row"><kbd>R</kbd><span>Rectangle</span></div>
                    <div className="cs-shortcut-row"><kbd>O / C</kbd><span>Circle / Ellipse</span></div>
                    <div className="cs-shortcut-row"><kbd>L</kbd><span>Straight Line</span></div>
                    <div className="cs-shortcut-row"><kbd>T</kbd><span>Text Box</span></div>
                    <div className="cs-shortcut-row"><kbd>S / I</kbd><span>Shapes & Stickers</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + U</kbd><span>Import Image</span></div>
                  </div>

                  <div className="cs-shortcut-category">
                    <span className="cs-shortcut-cat-title">Object Editing</span>
                    <div className="cs-shortcut-row"><kbd>Arrows</kbd><span>Nudge 1px</span></div>
                    <div className="cs-shortcut-row"><kbd>Shift + Arrows</kbd><span>Nudge 10px</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + D</kbd><span>Duplicate Shape</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + C / V</kbd><span>Copy & Paste</span></div>
                    <div className="cs-shortcut-row"><kbd>Del / Backspace</kbd><span>Delete Shape</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + A</kbd><span>Select Object</span></div>
                  </div>

                  <div className="cs-shortcut-category">
                    <span className="cs-shortcut-cat-title">Canvas & Navigation</span>
                    <div className="cs-shortcut-row"><kbd>Space + Drag</kbd><span>Pan Whiteboard</span></div>
                    <div className="cs-shortcut-row"><kbd>Scroll</kbd><span>Zoom into Cursor</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + 0</kbd><span>Fit to Screen</span></div>
                    <div className="cs-shortcut-row"><kbd>Ctrl + 1</kbd><span>100% Actual Size</span></div>
                    <div className="cs-shortcut-row"><kbd>Shift + 2</kbd><span>Zoom to Selection</span></div>
                    <div className="cs-shortcut-row"><kbd>Escape</kbd><span>Deselect / Close</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Floating Reopen Toggle for Left Sidebar */}
          <button
            type="button"
            className={`cs-floating-edge-pill is-left ${!leftSidebarOpen ? 'is-visible' : ''}`}
            onClick={() => setLeftSidebarOpen(true)}
            title="Open Pages & Layers (L)"
            aria-label="Open Pages & Layers"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Layers</span>
          </button>

          {/* Floating Reopen Toggle for Right Sidebar */}
          <button
            type="button"
            className={`cs-floating-edge-pill is-right ${!rightSidebarOpen ? 'is-visible' : ''}`}
            onClick={() => setRightSidebarOpen(true)}
            title="Open Design & Properties"
            aria-label="Open Design & Properties"
          >
            <span>Design</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </main>

        {/* Right Design & Room Panel — Smoothly Animated */}
        <aside className={`cs-room-props-sidebar ${!rightSidebarOpen ? 'is-collapsed' : ''}`} aria-hidden={!rightSidebarOpen}>
          <div className="cs-props-sidebar-inner">
            <div className="cs-props-tabs-header">
              <TabButton label="Design" active={rightTab === 'design'} onClick={() => setRightTab('design')} />
              <TabButton
                label={`Room${activeUsers.length > 0 ? ` (${activeUsers.length})` : ''}`}
                active={rightTab === 'room'}
                onClick={() => setRightTab('room')}
              />
              <button
                type="button"
                className="cs-room-nav-btn"
                style={{ width: 26, height: 26, margin: '8px 10px 8px auto', padding: 0 }}
                onClick={() => setRightSidebarOpen(false)}
                title="Collapse properties panel"
                aria-label="Collapse properties panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="cs-props-scroll-body">
              {rightTab === 'design' ? (
                <PropertiesPanel
                  shape={selectedShape}
                  recentColors={recentColors}
                  onChange={handlePropertiesChange}
                  onUseColor={addRecentColor}
                  onExportSelectionPNG={exportSelectionPNG}
                  onExportSelectionSVG={exportSelectionSVG}
                  onExportCanvasPNG={exportCanvasPNG}
                />
              ) : (
                <div style={{ padding: '16px 14px' }}>
                  {isPersonalWorkspace ? (
                    <p className="cs-empty-inline">
                      This is your private workspace draft. No one else can see or access it.
                    </p>
                  ) : accessError && !connected ? (
                    <div className="cs-error">{accessError}</div>
                  ) : isOwner ? (
                    <div>
                      <p className="cs-empty-inline" style={{ marginBottom: 14 }}>
                        You own this room. Invite teammates below to grant edit access.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input
                          type="text"
                          value={inviteQuery}
                          onChange={(e) => handleInviteSearch(e.target.value)}
                          placeholder="Search by username or email…"
                          aria-label="Invite user"
                          className="cs-room-invite-input"
                        />
                        {inviteResults.length > 0 && (
                          <div className="cs-invite-results-box">
                            {inviteResults.map((r) => (
                              <div key={r.user_id} className="cs-invite-result-row">
                                <span style={{ minWidth: 0 }}>
                                  <strong style={{ color: '#FFFFFF' }}>{r.username}</strong>
                                  <span style={{ color: '#94A3B8', display: 'block', fontSize: 11 }}>
                                    {r.email}
                                  </span>
                                </span>
                                <button className="cs-bento-primary-btn" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => grantAccess(r.user_id)}>
                                  Invite
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {inviteDoneMsg && <div className="cs-error" style={{ margin: 0 }}>{inviteDoneMsg}</div>}
                      </div>

                      <div style={{ marginTop: 20 }}>
                        <div className="cs-props-group-label">
                          Invited Collaborators ({members.length})
                        </div>
                        {members.length === 0 ? (
                          <p className="cs-empty-inline">No collaborators added yet.</p>
                        ) : (
                          members.map((m) => (
                            <div key={m.user_id} className="cs-user-row">
                              <span className="cs-live-dot" />
                              <span style={{ flex: '1 1 auto', minWidth: 0, color: '#E2E8F0', fontSize: 12 }}>
                                {m.username || m.email}
                              </span>
                              {m.user_id !== user?.user_id && (
                                <button
                                  className="cs-layer-delete-btn"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: 10,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#F87171',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => revokeAccess(m.user_id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : activeUsers.length === 0 ? (
                    <p className="cs-empty-inline">No other teammates active</p>
                  ) : (
                    activeUsers.map((user) => (
                      <div key={user.user_id} className="cs-user-row">
                        <span className="cs-live-dot" />
                        <span style={{ color: '#E2E8F0', fontSize: 12 }}>{user.username || user.email}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Import Image Modal */}
      {showImageImportModal && (
        <div className="cs-modal-backdrop" onClick={() => setShowImageImportModal(false)}>
          <div className="cs-shortcuts-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Import Image to Canvas</span>
              </div>
              <button type="button" className="cs-modal-close" onClick={() => setShowImageImportModal(false)}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Option 1: Upload from local device */}
              <div>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Option 1: Upload Image File
                </span>
                <div
                  style={{
                    border: '2px dashed rgba(129, 140, 248, 0.4)',
                    borderRadius: 12,
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: 'rgba(99, 102, 241, 0.04)',
                    cursor: 'pointer',
                    transition: 'all 160ms ease',
                  }}
                  onClick={() => imageFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const file = e.dataTransfer.files[i];
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const src = evt.target?.result as string;
                            if (src) importImage(src, file.name);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>
                    Click to browse or drop images here
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#64748B' }}>
                    Supports PNG, JPG, WebP, SVG, GIF (Multi-upload supported)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
              </div>

              {/* Option 2: Paste Web Image URL */}
              <div>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Option 2: Import from Web URL
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!imageUrlInput.trim()) {
                      setImageUrlError('Please enter an image URL.');
                      return;
                    }
                    importImage(imageUrlInput.trim(), 'Web Image');
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      setImageUrlError(null);
                    }}
                    className="cs-room-invite-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="cs-bento-primary-btn"
                    style={{ padding: '0 16px', fontSize: 12 }}
                  >
                    Import
                  </button>
                </form>
                {imageUrlError && <div className="cs-error" style={{ margin: '8px 0 0' }}>{imageUrlError}</div>}
              </div>

              {/* Pro tip */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#94A3B8', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#F59E0B', fontSize: 14 }}>💡</span>
                <span><strong>Pro-tip:</strong> You can also paste screenshots directly from your clipboard (<strong>Ctrl+V</strong>) or drag & drop files onto the canvas!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="cs-toast">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}