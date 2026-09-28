
export type IconPrimitive =
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'polyline'; points: string }
  | { t: 'polygon'; points: string }
  | { t: 'path'; d: string };

export interface IconDef {
  id: string;
  label: string;
  els: IconPrimitive[];
}

export function IconPrimitiveEl({ p }: { p: IconPrimitive }) {
  switch (p.t) {
    case 'circle':
      return <circle cx={p.cx} cy={p.cy} r={p.r} />;
    case 'rect':
      return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx ?? 0} />;
    case 'line':
      return <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />;
    case 'polyline':
      return <polyline points={p.points} />;
    case 'polygon':
      return <polygon points={p.points} />;
    case 'path':
      return <path d={p.d} />;
  }
}

// Renders any icon (from this registry or the small toolbar set below)
// inside a 24x24 viewBox. `size` controls the rendered pixel size.
export function IconGlyph({
  els,
  size = 18,
  strokeWidth = 2,
  color = 'currentColor',
}: {
  els: IconPrimitive[];
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {els.map((p, i) => (
        <IconPrimitiveEl key={i} p={p} />
      ))}
    </svg>
  );
}

// ---- Toolbar-only glyphs (not part of the insertable library) ----

export const TOOLBAR_ICONS: Record<string, IconPrimitive[]> = {
  select: [{ t: 'polygon', points: '5,3 5,19 9.5,15.5 12.5,21 15,19.5 12,14 18,14' }],
  rectangle: [{ t: 'rect', x: 4, y: 6, w: 16, h: 12, rx: 1.5 }],
  circle: [{ t: 'circle', cx: 12, cy: 12, r: 8 }],
  line: [{ t: 'line', x1: 5, y1: 19, x2: 19, y2: 5 }],
  text: [
    { t: 'line', x1: 5, y1: 5, x2: 19, y2: 5 },
    { t: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
  ],
  trash: [
    { t: 'line', x1: 4, y1: 7, x2: 20, y2: 7 },
    { t: 'path', d: 'M6 7 L7 20 A1 1 0 0 0 8 21 H16 A1 1 0 0 0 17 20 L18 7' },
    { t: 'line', x1: 9, y1: 4, x2: 15, y2: 4 },
    { t: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { t: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
  image: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'circle', cx: 8.5, cy: 8.5, r: 1.5 },
    { t: 'polyline', points: '21,15 16,10 5,21' },
  ],
  upload: [
    { t: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { t: 'polyline', points: '17 8 12 3 7 8' },
    { t: 'line', x1: 12, y1: 3, x2: 12, y2: 15 },
  ],
  chevronDown: [{ t: 'polyline', points: '6,9 12,15 18,9' }],
  chevronUp: [{ t: 'polyline', points: '6,15 12,9 18,15' }],
};

// ---- Insertable icon library: 40 shown up front, 50 more behind "See more" ----

const first40: IconDef[] = [
  { id: 'home', label: 'Home', els: [
    { t: 'polyline', points: '4,11 12,4 20,11' },
    { t: 'path', d: 'M6 10 V20 H18 V10' },
  ]},
  { id: 'search', label: 'Search', els: [
    { t: 'circle', cx: 10.5, cy: 10.5, r: 6.5 },
    { t: 'line', x1: 15.5, y1: 15.5, x2: 20, y2: 20 },
  ]},
  { id: 'settings', label: 'Settings', els: [
    { t: 'circle', cx: 12, cy: 12, r: 3 },
    { t: 'line', x1: 12, y1: 2, x2: 12, y2: 5 },
    { t: 'line', x1: 12, y1: 19, x2: 12, y2: 22 },
    { t: 'line', x1: 2, y1: 12, x2: 5, y2: 12 },
    { t: 'line', x1: 19, y1: 12, x2: 22, y2: 12 },
    { t: 'line', x1: 4.9, y1: 4.9, x2: 7, y2: 7 },
    { t: 'line', x1: 17, y1: 17, x2: 19.1, y2: 19.1 },
    { t: 'line', x1: 4.9, y1: 19.1, x2: 7, y2: 17 },
    { t: 'line', x1: 17, y1: 7, x2: 19.1, y2: 4.9 },
  ]},
  { id: 'star', label: 'Star', els: [
    { t: 'polygon', points: '12,3 14.7,9.3 21.5,9.9 16.3,14.3 17.9,21 12,17.3 6.1,21 7.7,14.3 2.5,9.9 9.3,9.3' },
  ]},
  { id: 'heart', label: 'Heart', els: [
    { t: 'path', d: 'M12 20 C6 15.5 3 12 3 8.5 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8.5 C21 12 18 15.5 12 20 Z' },
  ]},
  { id: 'plus', label: 'Plus', els: [
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
  ]},
  { id: 'minus', label: 'Minus', els: [{ t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 }]},
  { id: 'check', label: 'Check', els: [{ t: 'polyline', points: '4,13 9,18 20,6' }]},
  { id: 'x', label: 'Close', els: [
    { t: 'line', x1: 5, y1: 5, x2: 19, y2: 19 },
    { t: 'line', x1: 19, y1: 5, x2: 5, y2: 19 },
  ]},
  { id: 'menu', label: 'Menu', els: [
    { t: 'line', x1: 4, y1: 6, x2: 20, y2: 6 },
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
    { t: 'line', x1: 4, y1: 18, x2: 20, y2: 18 },
  ]},
  { id: 'user', label: 'User', els: [
    { t: 'circle', cx: 12, cy: 8, r: 3.5 },
    { t: 'path', d: 'M4.5 21 C4.5 16.5 8 14 12 14 C16 14 19.5 16.5 19.5 21' },
  ]},
  { id: 'users', label: 'Users', els: [
    { t: 'circle', cx: 9, cy: 8, r: 3 },
    { t: 'path', d: 'M2.5 20 C2.5 16.5 5.4 14 9 14 C12.6 14 15.5 16.5 15.5 20' },
    { t: 'path', d: 'M15 14.3 C17.9 14.7 20 16.9 20 20' },
    { t: 'circle', cx: 16.3, cy: 8, r: 2.4 },
  ]},
  { id: 'mail', label: 'Mail', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.5 },
    { t: 'polyline', points: '3,6 12,13 21,6' },
  ]},
  { id: 'phone', label: 'Phone', els: [
    { t: 'path', d: 'M5 4 H9 L11 9 L8.5 10.5 A12 12 0 0 0 13.5 15.5 L15 13 L20 15 V19 A2 2 0 0 1 18 21 C10 21 3 14 3 6 A2 2 0 0 1 5 4 Z' },
  ]},
  { id: 'calendar', label: 'Calendar', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 16, rx: 1.5 },
    { t: 'line', x1: 3, y1: 10, x2: 21, y2: 10 },
    { t: 'line', x1: 8, y1: 2, x2: 8, y2: 6 },
    { t: 'line', x1: 16, y1: 2, x2: 16, y2: 6 },
  ]},
  { id: 'clock', label: 'Clock', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'polyline', points: '12,7 12,12 16,14' },
  ]},
  { id: 'folder', label: 'Folder', els: [
    { t: 'path', d: 'M3 7 A1 1 0 0 1 4 6 H9 L11 8 H20 A1 1 0 0 1 21 9 V18 A1 1 0 0 1 20 19 H4 A1 1 0 0 1 3 18 Z' },
  ]},
  { id: 'file', label: 'File', els: [
    { t: 'path', d: 'M6 3 H14 L19 8 V21 H6 Z' },
    { t: 'polyline', points: '14,3 14,8 19,8' },
  ]},
  { id: 'image', label: 'Image', els: [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 1.5 },
    { t: 'circle', cx: 9, cy: 10, r: 1.8 },
    { t: 'polyline', points: '4,19 10,13 14,17 17,14 21,18' },
  ]},
  { id: 'camera', label: 'Camera', els: [
    { t: 'path', d: 'M4 8 H8 L9.5 5.5 H14.5 L16 8 H20 A1 1 0 0 1 21 9 V18 A1 1 0 0 1 20 19 H4 A1 1 0 0 1 3 18 V9 A1 1 0 0 1 4 8 Z' },
    { t: 'circle', cx: 12, cy: 13.5, r: 3.5 },
  ]},
  { id: 'trash', label: 'Trash', els: TOOLBAR_ICONS_REF('trash') },
  { id: 'video', label: 'Video', els: [
    { t: 'rect', x: 3, y: 6, w: 12, h: 12, rx: 1.5 },
    { t: 'polygon', points: '15,10 21,7 21,17 15,14' },
  ]},
  { id: 'music', label: 'Music', els: [
    { t: 'circle', cx: 7, cy: 18, r: 2.5 },
    { t: 'circle', cx: 18, cy: 16, r: 2.5 },
    { t: 'line', x1: 9.5, y1: 18, x2: 9.5, y2: 5 },
    { t: 'line', x1: 20.5, y1: 16, x2: 20.5, y2: 3 },
    { t: 'line', x1: 9.5, y1: 5, x2: 20.5, y2: 3 },
  ]},
  { id: 'play', label: 'Play', els: [{ t: 'polygon', points: '6,4 20,12 6,20' }]},
  { id: 'pause', label: 'Pause', els: [
    { t: 'rect', x: 6, y: 4, w: 4, h: 16, rx: 1 },
    { t: 'rect', x: 14, y: 4, w: 4, h: 16, rx: 1 },
  ]},
  { id: 'stop', label: 'Stop', els: [{ t: 'rect', x: 5, y: 5, w: 14, h: 14, rx: 1.5 }]},
  { id: 'volume', label: 'Volume', els: [
    { t: 'polygon', points: '4,10 8,10 13,5 13,19 8,14 4,14' },
    { t: 'path', d: 'M16.5 8.5 A5 5 0 0 1 16.5 15.5' },
  ]},
  { id: 'mic', label: 'Mic', els: [
    { t: 'rect', x: 9, y: 3, w: 6, h: 11, rx: 3 },
    { t: 'path', d: 'M5 11 A7 7 0 0 0 19 11' },
    { t: 'line', x1: 12, y1: 18, x2: 12, y2: 22 },
    { t: 'line', x1: 8, y1: 22, x2: 16, y2: 22 },
  ]},
  { id: 'headphones', label: 'Headphones', els: [
    { t: 'path', d: 'M4 15 V12 A8 8 0 0 1 20 12 V15' },
    { t: 'rect', x: 2.5, y: 14, w: 4, h: 6, rx: 1.5 },
    { t: 'rect', x: 17.5, y: 14, w: 4, h: 6, rx: 1.5 },
  ]},
  { id: 'skipForward', label: 'Skip forward', els: [
    { t: 'polygon', points: '5,4 15,12 5,20' },
    { t: 'line', x1: 18, y1: 4, x2: 18, y2: 20 },
  ]},
  { id: 'skipBack', label: 'Skip back', els: [
    { t: 'polygon', points: '19,4 9,12 19,20' },
    { t: 'line', x1: 6, y1: 4, x2: 6, y2: 20 },
  ]},
  { id: 'arrowUp', label: 'Arrow up', els: [
    { t: 'line', x1: 12, y1: 20, x2: 12, y2: 4 },
    { t: 'polyline', points: '6,10 12,4 18,10' },
  ]},
  { id: 'arrowDown', label: 'Arrow down', els: [
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
    { t: 'polyline', points: '6,14 12,20 18,14' },
  ]},
  { id: 'arrowLeft', label: 'Arrow left', els: [
    { t: 'line', x1: 20, y1: 12, x2: 4, y2: 12 },
    { t: 'polyline', points: '10,6 4,12 10,18' },
  ]},
  { id: 'arrowRight', label: 'Arrow right', els: [
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
    { t: 'polyline', points: '14,6 20,12 14,18' },
  ]},
  { id: 'arrowUpRight', label: 'Arrow up-right', els: [
    { t: 'line', x1: 6, y1: 18, x2: 18, y2: 6 },
    { t: 'polyline', points: '9,6 18,6 18,15' },
  ]},
  { id: 'arrowDownLeft', label: 'Arrow down-left', els: [
    { t: 'line', x1: 18, y1: 6, x2: 6, y2: 18 },
    { t: 'polyline', points: '15,18 6,18 6,9' },
  ]},
  { id: 'chevronUp', label: 'Chevron up', els: TOOLBAR_ICONS_REF('chevronUp') },
  { id: 'chevronDown', label: 'Chevron down', els: TOOLBAR_ICONS_REF('chevronDown') },
  { id: 'refresh', label: 'Refresh', els: [
    { t: 'path', d: 'M4 12 A8 8 0 0 1 19 8' },
    { t: 'polyline', points: '19,3 19,8 14,8' },
    { t: 'path', d: 'M20 12 A8 8 0 0 1 5 16' },
    { t: 'polyline', points: '5,21 5,16 10,16' },
  ]},
];

// helper used only during module init above (kept tiny + local)
function TOOLBAR_ICONS_REF(key: string): IconPrimitive[] {
  return TOOLBAR_ICONS[key];
}

const next50: IconDef[] = [
  { id: 'share', label: 'Share', els: [
    { t: 'circle', cx: 18, cy: 5, r: 2.5 },
    { t: 'circle', cx: 6, cy: 12, r: 2.5 },
    { t: 'circle', cx: 18, cy: 19, r: 2.5 },
    { t: 'line', x1: 8.2, y1: 10.8, x2: 15.8, y2: 6.2 },
    { t: 'line', x1: 8.2, y1: 13.2, x2: 15.8, y2: 17.8 },
  ]},
  { id: 'edit', label: 'Edit', els: [
    { t: 'path', d: 'M4 20 L4.7 16.3 L15.5 5.5 A2 2 0 0 1 18.5 8.5 L7.7 19.3 Z' },
    { t: 'line', x1: 13.5, y1: 7.5, x2: 16.5, y2: 10.5 },
  ]},
  { id: 'save', label: 'Save', els: [
    { t: 'path', d: 'M5 3 H16 L20 7 V20 A1 1 0 0 1 19 21 H5 A1 1 0 0 1 4 20 V4 A1 1 0 0 1 5 3 Z' },
    { t: 'rect', x: 7, y: 3, w: 8, h: 6 },
    { t: 'rect', x: 7, y: 14, w: 10, h: 7 },
  ]},
  { id: 'download', label: 'Download', els: [
    { t: 'line', x1: 12, y1: 3, x2: 12, y2: 15 },
    { t: 'polyline', points: '6,9 12,15 18,9' },
    { t: 'polyline', points: '4,19 20,19' },
  ]},
  { id: 'upload', label: 'Upload', els: [
    { t: 'line', x1: 12, y1: 21, x2: 12, y2: 9 },
    { t: 'polyline', points: '6,15 12,9 18,15' },
    { t: 'polyline', points: '4,5 20,5' },
  ]},
  { id: 'link', label: 'Link', els: [
    { t: 'path', d: 'M9 15 L15 9' },
    { t: 'path', d: 'M11 6 L13.5 3.5 A3.5 3.5 0 0 1 18.5 8.5 L16 11' },
    { t: 'path', d: 'M13 18 L10.5 20.5 A3.5 3.5 0 0 1 5.5 15.5 L8 13' },
  ]},
  { id: 'lock', label: 'Lock', els: [
    { t: 'rect', x: 5, y: 11, w: 14, h: 10, rx: 1.5 },
    { t: 'path', d: 'M8 11 V7 A4 4 0 0 1 16 7 V11' },
  ]},
  { id: 'unlock', label: 'Unlock', els: [
    { t: 'rect', x: 5, y: 11, w: 14, h: 10, rx: 1.5 },
    { t: 'path', d: 'M8 11 V7 A4 4 0 0 1 15.5 5' },
  ]},
  { id: 'eye', label: 'Eye', els: [
    { t: 'path', d: 'M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z' },
    { t: 'circle', cx: 12, cy: 12, r: 3 },
  ]},
  { id: 'eyeOff', label: 'Eye off', els: [
    { t: 'path', d: 'M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z' },
    { t: 'circle', cx: 12, cy: 12, r: 3 },
    { t: 'line', x1: 3, y1: 21, x2: 21, y2: 3 },
  ]},
  { id: 'bell', label: 'Bell', els: [
    { t: 'path', d: 'M6 10 A6 6 0 0 1 18 10 C18 15 20 16 20 16 H4 C4 16 6 15 6 10 Z' },
    { t: 'path', d: 'M10 19 A2 2 0 0 0 14 19' },
  ]},
  { id: 'bookmark', label: 'Bookmark', els: [
    { t: 'path', d: 'M6 3 H18 V21 L12 16.5 L6 21 Z' },
  ]},
  { id: 'flag', label: 'Flag', els: [
    { t: 'line', x1: 5, y1: 3, x2: 5, y2: 21 },
    { t: 'path', d: 'M5 4 H18 L15 8.5 L18 13 H5 Z' },
  ]},
  { id: 'tag', label: 'Tag', els: [
    { t: 'path', d: 'M12 3 H19 V10 L11 18 A2 2 0 0 1 8 18 L4 14 A2 2 0 0 1 4 11 Z' },
    { t: 'circle', cx: 15.5, cy: 6.5, r: 1.3 },
  ]},
  { id: 'cart', label: 'Cart', els: [
    { t: 'circle', cx: 9, cy: 20, r: 1.5 },
    { t: 'circle', cx: 17, cy: 20, r: 1.5 },
    { t: 'path', d: 'M2 3 H5 L7.5 15 H18 L20.5 6 H6.2' },
  ]},
  { id: 'gift', label: 'Gift', els: [
    { t: 'rect', x: 4, y: 9, w: 16, h: 12, rx: 1 },
    { t: 'rect', x: 3, y: 6, w: 18, h: 4, rx: 1 },
    { t: 'line', x1: 12, y1: 6, x2: 12, y2: 21 },
    { t: 'path', d: 'M12 6 C9 6 8 2 11 2 C13 2 13 5 12 6 Z' },
    { t: 'path', d: 'M12 6 C15 6 16 2 13 2 C11 2 11 5 12 6 Z' },
  ]},
  { id: 'mapPin', label: 'Map pin', els: [
    { t: 'path', d: 'M12 21 C12 21 5 14 5 9 A7 7 0 0 1 19 9 C19 14 12 21 12 21 Z' },
    { t: 'circle', cx: 12, cy: 9, r: 2.5 },
  ]},
  { id: 'globe', label: 'Globe', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'line', x1: 3, y1: 12, x2: 21, y2: 12 },
    { t: 'path', d: 'M12 3 C15.5 6.5 15.5 17.5 12 21 C8.5 17.5 8.5 6.5 12 3 Z' },
  ]},
  { id: 'wifi', label: 'Wifi', els: [
    { t: 'path', d: 'M2 8.5 C8 3 16 3 22 8.5' },
    { t: 'path', d: 'M5.5 12.5 C9.5 9 14.5 9 18.5 12.5' },
    { t: 'path', d: 'M9 16.5 C10.8 15 13.2 15 15 16.5' },
    { t: 'circle', cx: 12, cy: 20, r: 1 },
  ]},
  { id: 'cloud', label: 'Cloud', els: [
    { t: 'path', d: 'M7 18 A4.5 4.5 0 0 1 7.5 9.1 A6 6 0 0 1 19 10.5 A4 4 0 0 1 18.5 18 Z' },
  ]},
  { id: 'sun', label: 'Sun', els: [
    { t: 'circle', cx: 12, cy: 12, r: 4.5 },
    { t: 'line', x1: 12, y1: 1, x2: 12, y2: 4 },
    { t: 'line', x1: 12, y1: 20, x2: 12, y2: 23 },
    { t: 'line', x1: 1, y1: 12, x2: 4, y2: 12 },
    { t: 'line', x1: 20, y1: 12, x2: 23, y2: 12 },
    { t: 'line', x1: 4.2, y1: 4.2, x2: 6.3, y2: 6.3 },
    { t: 'line', x1: 17.7, y1: 17.7, x2: 19.8, y2: 19.8 },
    { t: 'line', x1: 4.2, y1: 19.8, x2: 6.3, y2: 17.7 },
    { t: 'line', x1: 17.7, y1: 6.3, x2: 19.8, y2: 4.2 },
  ]},
  { id: 'moon', label: 'Moon', els: [
    { t: 'path', d: 'M20 14.5 A8.5 8.5 0 1 1 9.5 4 A6.8 6.8 0 0 0 20 14.5 Z' },
  ]},
  { id: 'printer', label: 'Printer', els: [
    { t: 'rect', x: 4, y: 8, w: 16, h: 8, rx: 1 },
    { t: 'polyline', points: '7,8 7,3 17,3 17,8' },
    { t: 'rect', x: 7, y: 14, w: 10, h: 7 },
  ]},
  { id: 'copy', label: 'Copy', els: [
    { t: 'rect', x: 8, y: 8, w: 12, h: 12, rx: 1.5 },
    { t: 'path', d: 'M5.5 16 H4 A1 1 0 0 1 3 15 V4 A1 1 0 0 1 4 3 H15 A1 1 0 0 1 16 4 V5.5' },
  ]},
  { id: 'scissors', label: 'Cut', els: [
    { t: 'circle', cx: 6.5, cy: 6.5, r: 2.5 },
    { t: 'circle', cx: 6.5, cy: 17.5, r: 2.5 },
    { t: 'line', x1: 8.5, y1: 8.2, x2: 20, y2: 20 },
    { t: 'line', x1: 8.5, y1: 15.8, x2: 20, y2: 4 },
  ]},
  { id: 'clipboard', label: 'Paste', els: [
    { t: 'rect', x: 6, y: 4, w: 12, h: 17, rx: 1.5 },
    { t: 'rect', x: 9, y: 2, w: 6, h: 4, rx: 1 },
  ]},
  { id: 'undo', label: 'Undo', els: [
    { t: 'path', d: 'M6 8 H15 A5 5 0 0 1 15 18 H9' },
    { t: 'polyline', points: '10,4 6,8 10,12' },
  ]},
  { id: 'redo', label: 'Redo', els: [
    { t: 'path', d: 'M18 8 H9 A5 5 0 0 0 9 18 H15' },
    { t: 'polyline', points: '14,4 18,8 14,12' },
  ]},
  { id: 'zoomIn', label: 'Zoom in', els: [
    { t: 'circle', cx: 10.5, cy: 10.5, r: 6.5 },
    { t: 'line', x1: 15.5, y1: 15.5, x2: 20, y2: 20 },
    { t: 'line', x1: 10.5, y1: 7.5, x2: 10.5, y2: 13.5 },
    { t: 'line', x1: 7.5, y1: 10.5, x2: 13.5, y2: 10.5 },
  ]},
  { id: 'zoomOut', label: 'Zoom out', els: [
    { t: 'circle', cx: 10.5, cy: 10.5, r: 6.5 },
    { t: 'line', x1: 15.5, y1: 15.5, x2: 20, y2: 20 },
    { t: 'line', x1: 7.5, y1: 10.5, x2: 13.5, y2: 10.5 },
  ]},
  { id: 'filter', label: 'Filter', els: [{ t: 'polygon', points: '3,4 21,4 14,12.5 14,19 10,21 10,12.5' }]},
  { id: 'grid', label: 'Grid', els: [
    { t: 'rect', x: 3, y: 3, w: 7, h: 7 },
    { t: 'rect', x: 14, y: 3, w: 7, h: 7 },
    { t: 'rect', x: 3, y: 14, w: 7, h: 7 },
    { t: 'rect', x: 14, y: 14, w: 7, h: 7 },
  ]},
  { id: 'list', label: 'List', els: [
    { t: 'line', x1: 8, y1: 6, x2: 21, y2: 6 },
    { t: 'line', x1: 8, y1: 12, x2: 21, y2: 12 },
    { t: 'line', x1: 8, y1: 18, x2: 21, y2: 18 },
    { t: 'circle', cx: 4, cy: 6, r: 1 },
    { t: 'circle', cx: 4, cy: 12, r: 1 },
    { t: 'circle', cx: 4, cy: 18, r: 1 },
  ]},
  { id: 'layers', label: 'Layers', els: [
    { t: 'polygon', points: '12,3 21,8 12,13 3,8' },
    { t: 'polyline', points: '3,13 12,18 21,13' },
    { t: 'polyline', points: '3,17.5 12,22.5 21,17.5' },
  ]},
  { id: 'sliders', label: 'Sliders', els: [
    { t: 'line', x1: 5, y1: 4, x2: 5, y2: 20 },
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
    { t: 'line', x1: 19, y1: 4, x2: 19, y2: 20 },
    { t: 'circle', cx: 5, cy: 9, r: 2 },
    { t: 'circle', cx: 12, cy: 15, r: 2 },
    { t: 'circle', cx: 19, cy: 7, r: 2 },
  ]},
  { id: 'terminal', label: 'Terminal', els: [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 1.5 },
    { t: 'polyline', points: '7,9 11,12.5 7,16' },
    { t: 'line', x1: 12, y1: 16, x2: 17, y2: 16 },
  ]},
  { id: 'code', label: 'Code', els: [
    { t: 'polyline', points: '9,6 3,12 9,18' },
    { t: 'polyline', points: '15,6 21,12 15,18' },
  ]},
  { id: 'database', label: 'Database', els: [
    { t: 'path', d: 'M4 6 C4 4.3 7.6 3 12 3 C16.4 3 20 4.3 20 6 C20 7.7 16.4 9 12 9 C7.6 9 4 7.7 4 6 Z' },
    { t: 'path', d: 'M4 6 V18 C4 19.7 7.6 21 12 21 C16.4 21 20 19.7 20 18 V6' },
    { t: 'path', d: 'M4 12 C4 13.7 7.6 15 12 15 C16.4 15 20 13.7 20 12' },
  ]},
  { id: 'server', label: 'Server', els: [
    { t: 'rect', x: 3, y: 4, w: 18, h: 7, rx: 1.5 },
    { t: 'rect', x: 3, y: 13, w: 18, h: 7, rx: 1.5 },
    { t: 'circle', cx: 7, cy: 7.5, r: 1 },
    { t: 'circle', cx: 7, cy: 16.5, r: 1 },
  ]},
  { id: 'cpu', label: 'Cpu', els: [
    { t: 'rect', x: 7, y: 7, w: 10, h: 10, rx: 1 },
    { t: 'rect', x: 10, y: 10, w: 4, h: 4 },
    { t: 'line', x1: 9, y1: 2, x2: 9, y2: 5 },
    { t: 'line', x1: 15, y1: 2, x2: 15, y2: 5 },
    { t: 'line', x1: 9, y1: 19, x2: 9, y2: 22 },
    { t: 'line', x1: 15, y1: 19, x2: 15, y2: 22 },
    { t: 'line', x1: 2, y1: 9, x2: 5, y2: 9 },
    { t: 'line', x1: 2, y1: 15, x2: 5, y2: 15 },
    { t: 'line', x1: 19, y1: 9, x2: 22, y2: 9 },
    { t: 'line', x1: 19, y1: 15, x2: 22, y2: 15 },
  ]},
  { id: 'smartphone', label: 'Smartphone', els: [
    { t: 'rect', x: 7, y: 2, w: 10, h: 20, rx: 1.5 },
    { t: 'line', x1: 11, y1: 18.5, x2: 13, y2: 18.5 },
  ]},
  { id: 'monitor', label: 'Monitor', els: [
    { t: 'rect', x: 3, y: 4, w: 18, h: 12, rx: 1.5 },
    { t: 'line', x1: 8, y1: 20, x2: 16, y2: 20 },
    { t: 'line', x1: 12, y1: 16, x2: 12, y2: 20 },
  ]},
  { id: 'thumbsUp', label: 'Thumbs up', els: [
    { t: 'path', d: 'M7 11 V21 H5 A1 1 0 0 1 4 20 V12 A1 1 0 0 1 5 11 Z' },
    { t: 'path', d: 'M7 11 L10.5 3.5 A2 2 0 0 1 13.5 5.5 L12 11 H18 A2 2 0 0 1 19.9 13.6 L18.2 19.6 A2 2 0 0 1 16.3 21 H7' },
  ]},
  { id: 'thumbsDown', label: 'Thumbs down', els: [
    { t: 'path', d: 'M17 13 V3 H19 A1 1 0 0 1 20 4 V12 A1 1 0 0 1 19 13 Z' },
    { t: 'path', d: 'M17 13 L13.5 20.5 A2 2 0 0 1 10.5 18.5 L12 13 H6 A2 2 0 0 1 4.1 10.4 L5.8 4.4 A2 2 0 0 1 7.7 3 H17' },
  ]},
  { id: 'messageCircle', label: 'Message', els: [
    { t: 'path', d: 'M3 12 A9 9 0 1 1 8 20 L3 21 L4.2 16.5 A9 9 0 0 1 3 12 Z' },
  ]},
  { id: 'send', label: 'Send', els: [
    { t: 'polygon', points: '3,11 21,3 13,21 11,13' },
  ]},
  { id: 'atSign', label: 'At sign', els: [
    { t: 'circle', cx: 12, cy: 12, r: 4 },
    { t: 'path', d: 'M16 12 V14.5 A2.5 2.5 0 0 0 21 14.5 V12 A9 9 0 1 0 16.5 19.5' },
  ]},
  { id: 'hash', label: 'Hash', els: [
    { t: 'line', x1: 9, y1: 3, x2: 7, y2: 21 },
    { t: 'line', x1: 17, y1: 3, x2: 15, y2: 21 },
    { t: 'line', x1: 4, y1: 9, x2: 20, y2: 9 },
    { t: 'line', x1: 3, y1: 15, x2: 19, y2: 15 },
  ]},
  { id: 'dollarSign', label: 'Dollar', els: [
    { t: 'line', x1: 12, y1: 2, x2: 12, y2: 22 },
    { t: 'path', d: 'M17 6.5 C17 4.5 14.8 4 12.5 4 C9.5 4 7.5 5.3 7.5 7.5 C7.5 12.5 17 9.5 17 15.5 C17 18 14.5 19 12 19 C9.5 19 7 18 7 15.5' },
  ]},
  { id: 'briefcase', label: 'Briefcase', els: [
    { t: 'rect', x: 3, y: 8, w: 18, h: 12, rx: 1.5 },
    { t: 'path', d: 'M8 8 V6 A2 2 0 0 1 10 4 H14 A2 2 0 0 1 16 6 V8' },
    { t: 'line', x1: 3, y1: 13, x2: 21, y2: 13 },
  ]},
];

export const ICON_LIBRARY_FIRST: IconDef[] = first40;
export const ICON_LIBRARY_MORE: IconDef[] = next50;
export const ICON_LIBRARY_ALL: IconDef[] = [...first40, ...next50];

export function findIconDef(id: string): IconDef | undefined {
  return ICON_LIBRARY_ALL.find((i) => i.id === id);
}