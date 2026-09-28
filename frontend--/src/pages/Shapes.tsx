// Extended "insertable shapes" library — organized the same way as the
// classic Office/Visio Shapes gallery (Lines, Rectangles, Basic Shapes,
// Block Arrows, Equation Shapes, Flowchart, Stars and Banners, Callouts).
//
// Every shape is built from the same IconPrimitive vocabulary used in
// icons.ts (stroke-only, 24x24 grid, currentColor) so it renders through
// the existing <IconGlyph /> component and drops onto the canvas through
// the existing 'icon' shape type with zero changes to the shape model.

import { ICON_LIBRARY_ALL, type IconDef, type IconPrimitive } from './Icons';

export interface ShapeCategory {
  name: string;
  icons: IconDef[];
}

// ---------------------------------------------------------------- Lines --

const lines: IconDef[] = [
  { id: 'shLineStraight', label: 'Straight line', els: [
    { t: 'line', x1: 3, y1: 21, x2: 21, y2: 3 },
  ]},
  { id: 'shLineElbow', label: 'Elbow connector', els: [
    { t: 'polyline', points: '4,20 4,10 20,10 20,4' },
  ]},
  { id: 'shLineCurved', label: 'Curved connector', els: [
    { t: 'path', d: 'M4 20 C4 8 20 16 20 4' },
  ]},
  { id: 'shLineArrow', label: 'Arrow', els: [
    { t: 'line', x1: 4, y1: 20, x2: 20, y2: 4 },
    { t: 'polyline', points: '13,4 20,4 20,11' },
  ]},
  { id: 'shLineDoubleArrow', label: 'Double arrow', els: [
    { t: 'line', x1: 4, y1: 20, x2: 20, y2: 4 },
    { t: 'polyline', points: '13,4 20,4 20,11' },
    { t: 'polyline', points: '11,20 4,20 4,13' },
  ]},
  { id: 'shLineCurvedArrow', label: 'Curved arrow', els: [
    { t: 'path', d: 'M4 19 C4 8 15 13 19 6' },
    { t: 'polyline', points: '13,7 19,6 17,12' },
  ]},
];

// ---------------------------------------------------------- Rectangles --

const rectangles: IconDef[] = [
  { id: 'shRectPlain', label: 'Rectangle', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14 },
  ]},
  { id: 'shRectRounded', label: 'Rounded rectangle', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 4 },
  ]},
  { id: 'shRectSnipCorner', label: 'Snip corner rectangle', els: [
    { t: 'polygon', points: '3,5 16,5 21,10 21,19 3,19' },
  ]},
  { id: 'shRectRoundSnip', label: 'Round & snip corner rectangle', els: [
    { t: 'path', d: 'M3 9 A4 4 0 0 1 7 5 H16 L21 10 V19 H3 Z' },
  ]},
];

// ------------------------------------------------------------- Basic --

const basicShapes: IconDef[] = [
  { id: 'shTriangle', label: 'Triangle', els: [
    { t: 'polygon', points: '12,2.5 20.2,16.8 3.8,16.8' },
  ]},
  { id: 'shRightTriangle', label: 'Right triangle', els: [
    { t: 'polygon', points: '3,3 3,21 21,21' },
  ]},
  { id: 'shDiamond', label: 'Diamond', els: [
    { t: 'polygon', points: '12,1.5 22.5,12 12,22.5 1.5,12' },
  ]},
  { id: 'shParallelogram', label: 'Parallelogram', els: [
    { t: 'polygon', points: '7,5 21,5 17,19 3,19' },
  ]},
  { id: 'shTrapezoid', label: 'Trapezoid', els: [
    { t: 'polygon', points: '8,5 16,5 21,19 3,19' },
  ]},
  { id: 'shPentagon', label: 'Pentagon', els: [
    { t: 'polygon', points: '12,2.5 21,9.1 17.6,19.7 6.4,19.7 3,9.1' },
  ]},
  { id: 'shHexagon', label: 'Hexagon', els: [
    { t: 'polygon', points: '21.8,12 16.9,20.5 7.1,20.5 2.2,12 7.1,3.5 16.9,3.5' },
  ]},
  { id: 'shOctagon', label: 'Octagon', els: [
    { t: 'polygon', points: '15.7,3 21,8.3 21,15.7 15.7,21 8.3,21 3,15.7 3,8.3 8.3,3' },
  ]},
  { id: 'shCross', label: 'Cross', els: [
    { t: 'polygon', points: '9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9' },
  ]},
  { id: 'shCylinder', label: 'Cylinder', els: [
    { t: 'path', d: 'M4 6 C4 4.3 7.6 3 12 3 C16.4 3 20 4.3 20 6 C20 7.7 16.4 9 12 9 C7.6 9 4 7.7 4 6 Z' },
    { t: 'path', d: 'M4 6 V18 C4 19.7 7.6 21 12 21 C16.4 21 20 19.7 20 18 V6' },
  ]},
  { id: 'shCube', label: 'Cube', els: [
    { t: 'polygon', points: '12,3 20,7 12,11 4,7' },
    { t: 'line', x1: 4, y1: 7, x2: 4, y2: 17 },
    { t: 'line', x1: 20, y1: 7, x2: 20, y2: 17 },
    { t: 'line', x1: 12, y1: 11, x2: 12, y2: 21 },
    { t: 'line', x1: 4, y1: 17, x2: 12, y2: 21 },
    { t: 'line', x1: 20, y1: 17, x2: 12, y2: 21 },
  ]},
  { id: 'shDonut', label: 'Donut', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'circle', cx: 12, cy: 12, r: 4 },
  ]},
  { id: 'shArc', label: 'Arc', els: [
    { t: 'path', d: 'M5 19 A14 14 0 0 1 19 5' },
  ]},
  { id: 'shChord', label: 'Chord', els: [
    { t: 'path', d: 'M5 19 A14 14 0 0 1 19 5' },
    { t: 'line', x1: 5, y1: 19, x2: 19, y2: 5 },
  ]},
  { id: 'shTeardrop', label: 'Teardrop', els: [
    { t: 'path', d: 'M12 2 C12 2 20 11.5 20 15.5 A8 8 0 0 1 4 15.5 C4 11.5 12 2 12 2 Z' },
  ]},
  { id: 'shBlockArc', label: 'Block arc', els: [
    { t: 'path', d: 'M3 15 A13 13 0 0 1 15 3' },
    { t: 'path', d: 'M8 19 A9.5 9.5 0 0 1 19 8' },
    { t: 'line', x1: 3, y1: 15, x2: 8, y2: 19 },
    { t: 'line', x1: 15, y1: 3, x2: 19, y2: 8 },
  ]},
];

// ------------------------------------------------------- Block Arrows --

const blockArrows: IconDef[] = [
  { id: 'shArrowRight', label: 'Right arrow', els: [
    { t: 'polygon', points: '2,9 14,9 14,4 22,12 14,20 14,15 2,15' },
  ]},
  { id: 'shArrowLeft', label: 'Left arrow', els: [
    { t: 'polygon', points: '22,9 10,9 10,4 2,12 10,20 10,15 22,15' },
  ]},
  { id: 'shArrowUp', label: 'Up arrow', els: [
    { t: 'polygon', points: '9,22 9,10 4,10 12,2 20,10 15,10 15,22' },
  ]},
  { id: 'shArrowDown', label: 'Down arrow', els: [
    { t: 'polygon', points: '9,2 9,14 4,14 12,22 20,14 15,14 15,2' },
  ]},
  { id: 'shArrowLeftRight', label: 'Left-right arrow', els: [
    { t: 'polygon', points: '8,9 16,9 16,4 22,12 16,20 16,15 8,15 8,20 2,12 8,4' },
  ]},
  { id: 'shArrowUpDown', label: 'Up-down arrow', els: [
    { t: 'polygon', points: '9,8 9,16 4,16 12,22 20,16 15,16 15,8 20,8 12,2 4,8' },
  ]},
  { id: 'shArrowQuad', label: 'Quad arrow', els: [
    { t: 'rect', x: 9, y: 9, w: 6, h: 6 },
    { t: 'polygon', points: '12,1 8,7 16,7' },
    { t: 'polygon', points: '12,23 8,17 16,17' },
    { t: 'polygon', points: '1,12 7,8 7,16' },
    { t: 'polygon', points: '23,12 17,8 17,16' },
  ]},
  { id: 'shArrowChevron', label: 'Chevron', els: [
    { t: 'polygon', points: '2,5 13,5 21,12 13,19 2,19 10,12' },
  ]},
  { id: 'shArrowPentagon', label: 'Pentagon arrow', els: [
    { t: 'polygon', points: '2,5 14,5 21,12 14,19 2,19' },
  ]},
  { id: 'shArrowUTurn', label: 'U-turn arrow', els: [
    { t: 'path', d: 'M5 21 V10 A7 7 0 0 1 19 10 V13' },
    { t: 'polygon', points: '15,13 23,13 19,20' },
  ]},
];

// ----------------------------------------------------- Equation Shapes --

const equationShapes: IconDef[] = [
  { id: 'shEqPlus', label: 'Plus', els: [
    { t: 'polygon', points: '9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9' },
  ]},
  { id: 'shEqMinus', label: 'Minus', els: [
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
  ]},
  { id: 'shEqMultiply', label: 'Multiply', els: [
    { t: 'line', x1: 5, y1: 5, x2: 19, y2: 19 },
    { t: 'line', x1: 19, y1: 5, x2: 5, y2: 19 },
  ]},
  { id: 'shEqDivide', label: 'Divide', els: [
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
    { t: 'circle', cx: 12, cy: 5.5, r: 1.6 },
    { t: 'circle', cx: 12, cy: 18.5, r: 1.6 },
  ]},
  { id: 'shEqEqual', label: 'Equal', els: [
    { t: 'line', x1: 4, y1: 9, x2: 20, y2: 9 },
    { t: 'line', x1: 4, y1: 15, x2: 20, y2: 15 },
  ]},
  { id: 'shEqNotEqual', label: 'Not equal', els: [
    { t: 'line', x1: 4, y1: 9, x2: 20, y2: 9 },
    { t: 'line', x1: 4, y1: 15, x2: 20, y2: 15 },
    { t: 'line', x1: 8, y1: 20, x2: 16, y2: 4 },
  ]},
];

// ---------------------------------------------------------- Flowchart --

const flowchart: IconDef[] = [
  { id: 'shFlowProcess', label: 'Process', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14 },
  ]},
  { id: 'shFlowDecision', label: 'Decision', els: [
    { t: 'polygon', points: '12,1.5 22.5,12 12,22.5 1.5,12' },
  ]},
  { id: 'shFlowTerminator', label: 'Terminator', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 7 },
  ]},
  { id: 'shFlowData', label: 'Data', els: [
    { t: 'polygon', points: '7,5 21,5 17,19 3,19' },
  ]},
  { id: 'shFlowDocument', label: 'Document', els: [
    { t: 'path', d: 'M4 5 H20 V15 C17 19 15 13 12 16 C9 19 7 13 4 17 Z' },
  ]},
  { id: 'shFlowPredefinedProcess', label: 'Predefined process', els: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14 },
    { t: 'line', x1: 7, y1: 5, x2: 7, y2: 19 },
    { t: 'line', x1: 17, y1: 5, x2: 17, y2: 19 },
  ]},
  { id: 'shFlowStoredData', label: 'Stored data', els: [
    { t: 'path', d: 'M4 5 H16 A5 7 0 0 1 16 19 H4 Z' },
  ]},
  { id: 'shFlowInternalStorage', label: 'Internal storage', els: [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16 },
    { t: 'line', x1: 8, y1: 4, x2: 8, y2: 20 },
    { t: 'line', x1: 3, y1: 9, x2: 21, y2: 9 },
  ]},
  { id: 'shFlowManualInput', label: 'Manual input', els: [
    { t: 'polygon', points: '3,9 21,4 21,20 3,20' },
  ]},
  { id: 'shFlowPreparation', label: 'Preparation', els: [
    { t: 'polygon', points: '21.8,12 16.9,20.5 7.1,20.5 2.2,12 7.1,3.5 16.9,3.5' },
  ]},
  { id: 'shFlowConnector', label: 'Connector', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
  ]},
  { id: 'shFlowOffPageConnector', label: 'Off-page connector', els: [
    { t: 'polygon', points: '3,4 21,4 21,14 12,21 3,14' },
  ]},
  { id: 'shFlowDatabase', label: 'Database', els: [
    { t: 'path', d: 'M4 6 C4 4.3 7.6 3 12 3 C16.4 3 20 4.3 20 6 C20 7.7 16.4 9 12 9 C7.6 9 4 7.7 4 6 Z' },
    { t: 'path', d: 'M4 6 V18 C4 19.7 7.6 21 12 21 C16.4 21 20 19.7 20 18 V6' },
  ]},
  { id: 'shFlowDisplay', label: 'Display', els: [
    { t: 'path', d: 'M6 5 A7 7 0 0 0 6 19 H14 L20 12 L14 5 Z' },
  ]},
  { id: 'shFlowManualOperation', label: 'Manual operation', els: [
    { t: 'polygon', points: '3,5 21,5 16,19 8,19' },
  ]},
  { id: 'shFlowMerge', label: 'Merge', els: [
    { t: 'polygon', points: '3,4 21,4 12,20' },
  ]},
  { id: 'shFlowOr', label: 'Or', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { t: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ]},
  { id: 'shFlowSummingJunction', label: 'Summing junction', els: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'line', x1: 6.5, y1: 6.5, x2: 17.5, y2: 17.5 },
    { t: 'line', x1: 17.5, y1: 6.5, x2: 6.5, y2: 17.5 },
  ]},
];

// ---------------------------------------------------- Stars & Banners --

const starsAndBanners: IconDef[] = [
  { id: 'shStar4', label: '4-Point star', els: [
    { t: 'polygon', points: '12,1.5 15,9 22.5,12 15,15 12,22.5 9,15 1.5,12 9,9' },
  ]},
  { id: 'shStar5', label: '5-Point star', els: [
    { t: 'polygon', points: '12,1.5 14.4,8.8 22,8.8 15.8,13.2 18.2,20.5 12,16 5.8,20.5 8.2,13.2 2,8.8 9.6,8.8' },
  ]},
  { id: 'shStar6', label: '6-Point star', els: [
    { t: 'polygon', points: '12,1.5 14.6,7.5 21.1,6.8 17.2,12 21.1,17.3 14.6,16.5 12,22.5 9.4,16.5 2.9,17.3 6.8,12 2.9,6.8 9.4,7.5' },
  ]},
  { id: 'shStarBurst', label: 'Explosion', els: [
    { t: 'polygon', points: '12,1.5 14.5,6 19.4,4.6 18,9.5 22.5,12 18,14.5 19.4,19.4 14.5,18 12,22.5 9.5,18 4.6,19.4 6,14.5 1.5,12 6,9.5 4.6,4.6 9.5,6' },
  ]},
  { id: 'shRibbonBanner', label: 'Ribbon banner', els: [
    { t: 'rect', x: 6, y: 7, w: 12, h: 10 },
    { t: 'polygon', points: '2,7 6,7 4,12 6,17 2,17 4,12' },
    { t: 'polygon', points: '22,7 18,7 20,12 18,17 22,17 20,12' },
  ]},
  { id: 'shWaveBanner', label: 'Wave banner', els: [
    { t: 'path', d: 'M3 8 C6 5 9 11 12 8 C15 5 18 11 21 8 V16 C18 19 15 13 12 16 C9 19 6 13 3 16 Z' },
  ]},
  { id: 'shScrollBanner', label: 'Scroll banner', els: [
    { t: 'rect', x: 5, y: 8, w: 14, h: 8 },
    { t: 'path', d: 'M5 8 A3 4 0 0 0 5 16' },
    { t: 'path', d: 'M19 8 A3 4 0 0 1 19 16' },
  ]},
  { id: 'shDoubleWaveBanner', label: 'Double wave banner', els: [
    { t: 'path', d: 'M3 7 C6 4.3 9 9.7 12 7 C15 4.3 18 9.7 21 7 V12.5 C18 15.2 15 9.8 12 12.5 C9 15.2 6 9.8 3 12.5 Z' },
    { t: 'path', d: 'M3 12.5 C6 15.2 9 20.6 12 17.9' },
  ]},
];

// -------------------------------------------------------------- Callouts --

const callouts: IconDef[] = [
  { id: 'shCalloutRect', label: 'Rectangular callout', els: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 12 },
    { t: 'polygon', points: '6,15 6,21 12,15' },
  ]},
  { id: 'shCalloutRounded', label: 'Rounded rectangular callout', els: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 12, rx: 4 },
    { t: 'polygon', points: '6,15 6,21 12,15' },
  ]},
  { id: 'shCalloutOval', label: 'Oval callout', els: [
    { t: 'path', d: 'M3 9 A9 6 0 0 1 21 9 A9 6 0 0 1 3 9 Z' },
    { t: 'polygon', points: '8,14 8,20 13,14' },
  ]},
  { id: 'shCalloutCloud', label: 'Cloud callout', els: [
    { t: 'path', d: 'M7 12 A4.5 4.5 0 0 1 7.5 3.6 A6 6 0 0 1 19 5 A4 4 0 0 1 18.5 12 Z' },
    { t: 'circle', cx: 6, cy: 16, r: 1.6 },
    { t: 'circle', cx: 3.5, cy: 20, r: 1 },
  ]},
  { id: 'shCalloutLine', label: 'Line callout', els: [
    { t: 'line', x1: 4, y1: 20, x2: 10, y2: 12 },
    { t: 'line', x1: 10, y1: 12, x2: 16, y2: 12 },
    { t: 'rect', x: 16, y: 5, w: 6, h: 5 },
  ]},
];

// ------------------------------------------------------------------------

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  { name: 'Icons', icons: ICON_LIBRARY_ALL },
  { name: 'Lines', icons: lines },
  { name: 'Rectangles', icons: rectangles },
  { name: 'Basic Shapes', icons: basicShapes },
  { name: 'Block Arrows', icons: blockArrows },
  { name: 'Equation Shapes', icons: equationShapes },
  { name: 'Flowchart', icons: flowchart },
  { name: 'Stars and Banners', icons: starsAndBanners },
  { name: 'Callouts', icons: callouts },
];

// Top 22 popular shapes and connectors displayed directly in the header toolbar
export const HEADER_SHAPES: IconDef[] = [
  lines[3],            // Arrow Line
  lines[4],            // Double Arrow Line
  lines[1],            // Elbow Connector Line
  lines[2],            // Curved Connector Line
  basicShapes[0],      // Triangle
  basicShapes[2],      // Diamond
  starsAndBanners[1],  // 5-Point Star
  starsAndBanners[0],  // 4-Point Star
  basicShapes[4],      // Pentagon
  basicShapes[5],      // Hexagon
  basicShapes[6],      // Octagon
  basicShapes[7],      // Cross
  basicShapes[8],      // Cylinder
  basicShapes[9],      // Cube
  blockArrows[0],      // Right Arrow
  blockArrows[1],      // Left Arrow
  blockArrows[2],      // Up Arrow
  blockArrows[3],      // Down Arrow
  blockArrows[4],      // Left-Right Arrow
  callouts[3],         // Cloud Callout
  callouts[0],         // Rect Callout
  callouts[2],         // Oval Callout
];

// Direct 10 shapes added alongside 5 standard tools (Select, Rectangle, Circle, Line, Text) for 15 initial toolbar items
export const INITIAL_TOOLBAR_SHAPES: IconDef[] = [
  rectangles[1],       // Rounded Rectangle (shRectRounded)
  basicShapes[0],      // Triangle (shTriangle)
  basicShapes[2],      // Diamond (shDiamond)
  starsAndBanners[1],  // Star (shStar5)
  lines[3],            // Arrow Line (shLineArrow)
  lines[4],            // Double Arrow (shLineDoubleArrow)
  lines[1],            // Elbow Connector (shLineElbow)
  basicShapes[5],      // Hexagon (shHexagon)
  blockArrows[0],      // Right Arrow (shArrowRight)
  callouts[3],         // Cloud Callout (shCalloutCloud)
];

const ALL_SHAPE_ICONS: IconDef[] = SHAPE_CATEGORIES.flatMap((c) => c.icons);

// Superset lookup used by the canvas / layers panel — falls back through
// every category (including the original icon set) by id.
export function findShapeDef(id: string): IconDef | undefined {
  return ALL_SHAPE_ICONS.find((i) => i.id === id);
}

export type { IconDef, IconPrimitive };

