import { useState, useRef, useEffect } from 'react';
import type { CanvasPage, CanvasShape } from '../store/room.store';
import { findShapeDef } from './Shapes';
import { IconGlyph, TOOLBAR_ICONS, type IconDef } from './Icons';

interface LayersPanelProps {
  isOpen?: boolean;
  shapes: CanvasShape[];
  pages: CanvasPage[];
  activePageId: string;
  selectedShapeId: string | null;
  onSelectShape: (id: string) => void;
  onDeleteShape: (id: string) => void;
  onRenameShape: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onCollapse: () => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onFocusPage: (pageId: string) => void;
}

export const getShapeIconEls = (shape: CanvasShape): IconDef['els'] => {
  if (shape.type === 'image') return TOOLBAR_ICONS.image ?? TOOLBAR_ICONS.rectangle;
  if (shape.type === 'icon') {
    return findShapeDef(shape.iconId)?.els ?? TOOLBAR_ICONS.rectangle;
  }
  if (shape.type === 'text') return TOOLBAR_ICONS.text;
  if (shape.type === 'circle') return TOOLBAR_ICONS.circle;
  if (shape.type === 'line') return TOOLBAR_ICONS.line;
  return TOOLBAR_ICONS.rectangle;
};

export const getDefaultLayerLabel = (shape: CanvasShape, index: number): string => {
  if (shape.name && shape.name.trim()) return shape.name;
  if (shape.type === 'image') {
    return shape.fileName ? `Image (${shape.fileName})` : `Image ${index}`;
  }
  if (shape.type === 'text') {
    const preview = shape.text.trim().slice(0, 16);
    return preview ? `"${preview}"` : `Text ${index}`;
  }
  if (shape.type === 'icon') {
    const def = findShapeDef(shape.iconId);
    return def?.label ?? `Icon ${index}`;
  }
  const typeMap: Record<string, string> = {
    rectangle: 'Rectangle',
    circle: 'Ellipse',
    line: 'Line',
  };
  return `${typeMap[shape.type] || 'Shape'} ${index}`;
};

export default function LayersPanel({
  isOpen = true,
  shapes,
  pages,
  activePageId,
  selectedShapeId,
  onSelectShape,
  onDeleteShape,
  onRenameShape,
  onToggleVisibility,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onCollapse,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
  onFocusPage,
}: LayersPanelProps) {
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingShapeText, setEditingShapeText] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageText, setEditingPageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedPageIds, setExpandedPageIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    pages.forEach((p) => { initial[p.id] = true; });
    return initial;
  });
  const editShapeInputRef = useRef<HTMLInputElement | null>(null);
  const editPageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingShapeId && editShapeInputRef.current) {
      editShapeInputRef.current.focus();
      editShapeInputRef.current.select();
    }
  }, [editingShapeId]);

  useEffect(() => {
    if (editingPageId && editPageInputRef.current) {
      editPageInputRef.current.focus();
      editPageInputRef.current.select();
    }
  }, [editingPageId]);

  // Ensure new pages are expanded by default
  useEffect(() => {
    setExpandedPageIds((prev) => {
      const next = { ...prev };
      pages.forEach((p) => {
        if (next[p.id] === undefined) next[p.id] = true;
      });
      return next;
    });
  }, [pages]);

  const togglePageExpand = (pageId: string) => {
    setExpandedPageIds((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const startRenameShape = (shape: CanvasShape, index: number) => {
    setEditingShapeId(shape.id);
    setEditingShapeText(shape.name || getDefaultLayerLabel(shape, index));
  };

  const commitRenameShape = (id: string) => {
    if (editingShapeText.trim()) {
      onRenameShape(id, editingShapeText.trim());
    }
    setEditingShapeId(null);
  };

  const startRenamePage = (page: CanvasPage) => {
    setEditingPageId(page.id);
    setEditingPageText(page.name);
  };

  const commitRenamePage = (id: string) => {
    if (editingPageText.trim()) {
      onRenamePage(id, editingPageText.trim());
    }
    setEditingPageId(null);
  };

  // Helper to test which page a shape belongs to
  const getShapePageId = (s: CanvasShape): string => {
    const shapeY = 'y' in s ? s.y : 0;
    for (const p of pages) {
      if (shapeY >= p.y - 40 && shapeY < p.y + p.height + 40) {
        return p.id;
      }
    }
    return pages[0]?.id || 'page-1';
  };

  // Deep search matching across shape name, type, text, icon, and filename
  const matchShape = (shape: CanvasShape, index: number, query: string): boolean => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    if (shape.name && shape.name.toLowerCase().includes(q)) return true;
    if (shape.type && shape.type.toLowerCase().includes(q)) return true;
    if (shape.type === 'text' && shape.text && shape.text.toLowerCase().includes(q)) return true;
    if (shape.type === 'image' && shape.fileName && shape.fileName.toLowerCase().includes(q)) return true;
    if (shape.type === 'icon') {
      if (shape.iconId && shape.iconId.toLowerCase().includes(q)) return true;
      const def = findShapeDef(shape.iconId);
      if (def?.label && def.label.toLowerCase().includes(q)) return true;
    }
    const defaultLabel = getDefaultLayerLabel(shape, index).toLowerCase();
    return defaultLabel.includes(q);
  };

  // Figma renders top-most layers at the top of the layer list
  const indexedShapes = shapes.map((s, idx) => ({ shape: s, index: idx + 1 }));
  const reversedList = [...indexedShapes].reverse();
  const isSearching = Boolean(searchQuery.trim());
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredList = isSearching
    ? reversedList.filter(({ shape, index }) => matchShape(shape, index, searchLower))
    : reversedList;

  const totalMatchesCount = filteredList.length;

  return (
    <aside className={`cs-room-layers-panel ${!isOpen ? 'is-collapsed' : ''}`} aria-hidden={!isOpen}>
      <div className="cs-layers-panel-inner">
        {/* Panel Header */}
        <div className="cs-layers-head">
          <div className="cs-layers-title-row">
            <span className="cs-layers-heading">Pages & Layers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="cs-room-nav-btn"
              style={{ width: 26, height: 26, padding: 0 }}
              onClick={onAddPage}
              title="Add new Page (+)"
              aria-label="Add new Page"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className="cs-room-nav-btn"
              style={{ width: 26, height: 26, padding: 0 }}
              onClick={onCollapse}
              title="Collapse layers panel"
              aria-label="Collapse layers panel"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Standard Search Box */}
        <div className="cs-layers-search-box">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search layers & pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            className="cs-layers-search-input"
            aria-label="Search layers and pages"
          />
          {searchQuery && (
            <button
              type="button"
              className="cs-layers-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search match counter if searching */}
        {isSearching && (
          <div style={{ padding: '2px 12px 6px', fontSize: 10, color: '#94A3B8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{totalMatchesCount} matching layer{totalMatchesCount !== 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#818CF8', fontSize: 10, cursor: 'pointer', padding: 0 }}
            >
              Reset
            </button>
          </div>
        )}

        {/* Hierarchy / Multi-Page Tree Body */}
        <div className="cs-layers-list">
          <div className="cs-layer-tree-container">
            {isSearching && totalMatchesCount === 0 && !pages.some((p) => p.name.toLowerCase().includes(searchLower)) ? (
              <div className="cs-layers-empty" style={{ padding: '28px 14px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>No results found</p>
                <span style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
                  No layers match "{searchQuery}"
                </span>
                <button
                  type="button"
                  className="cs-btn-secondary"
                  style={{ fontSize: 11, padding: '4px 10px', margin: '0 auto', display: 'block' }}
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              pages.map((page, pageIdx) => {
                const pageMatches = isSearching && (page.name.toLowerCase().includes(searchLower) || `page ${pageIdx + 1}`.includes(searchLower));
                const pageShapes = filteredList.filter(({ shape }) => getShapePageId(shape) === page.id);
                const isPageExpanded = isSearching ? (pageShapes.length > 0 || pageMatches) : (expandedPageIds[page.id] ?? true);
                const isEditingPage = editingPageId === page.id;
                const isPageActive = activePageId === page.id;

                if (isSearching && pageShapes.length === 0 && !pageMatches) {
                  return null;
                }

            return (
              <div key={page.id} className="cs-page-section-block">
                {/* Level 1: Page / Artboard Node */}
                <div
                  className={`cs-layer-frame-node ${isPageActive ? 'is-active-page' : ''}`}
                  onClick={() => onFocusPage(page.id)}
                  title={`Page ${pageIdx + 1}: ${page.name} (${page.width} × ${page.height})`}
                >
                  <button
                    type="button"
                    className="cs-tree-chevron-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePageExpand(page.id);
                    }}
                    title={isPageExpanded ? 'Collapse page layers' : 'Expand page layers'}
                  >
                    <span className={`cs-tree-chevron ${isPageExpanded ? 'is-expanded' : ''}`}>
                      ›
                    </span>
                  </button>

                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isPageActive ? '#818CF8' : '#94A3B8'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                  </svg>

                  {isEditingPage ? (
                    <input
                      ref={editPageInputRef}
                      type="text"
                      value={editingPageText}
                      onChange={(e) => setEditingPageText(e.target.value)}
                      onBlur={() => commitRenamePage(page.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRenamePage(page.id);
                        if (e.key === 'Escape') setEditingPageId(null);
                      }}
                      className="cs-layer-inline-rename-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div className="cs-layer-name-wrapper">
                      <span
                        className="cs-frame-label"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startRenamePage(page);
                        }}
                      >
                        {page.name || `Page ${pageIdx + 1}`}
                      </span>
                      <button
                        type="button"
                        className="cs-layer-rename-trigger-btn"
                        title="Rename page"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenamePage(page);
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="cs-page-node-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="cs-page-node-btn"
                      onClick={() => onDuplicatePage(page.id)}
                      title="Duplicate page"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        className="cs-page-node-btn is-delete"
                        onClick={() => onDeletePage(page.id)}
                        title="Delete page"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Level 2: Children Layers of this Page */}
                {isPageExpanded && (
                  <div className="cs-layer-tree-children">
                    {pageShapes.length === 0 ? (
                      <div className="cs-layer-empty-branch">
                        <span>No shapes on this page</span>
                      </div>
                    ) : (
                      pageShapes.map(({ shape, index }) => {
                        const isSelected = shape.id === selectedShapeId;
                        const isHovered = shape.id === hoveredId;
                        const isEditingShape = shape.id === editingShapeId;
                        const isHidden = shape.hidden === true;
                        const isLocked = shape.locked === true;
                        const label = getDefaultLayerLabel(shape, index);
                        const iconEls = getShapeIconEls(shape);

                        return (
                          <div
                            key={shape.id}
                            onMouseEnter={() => setHoveredId(shape.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => onSelectShape(shape.id)}
                            className={`cs-figma-layer-item ${isSelected ? 'is-selected' : ''} ${
                              isHidden ? 'is-hidden-layer' : ''
                            } ${isLocked ? 'is-locked-layer' : ''}`}
                          >
                            {/* Tree Branch Connector Guide */}
                            <span className="cs-tree-branch-guide" aria-hidden="true" />

                            {/* Left: Shape Icon + Name */}
                            <div className="cs-layer-item-left">
                              <span
                                className={`cs-layer-shape-icon ${
                                  isSelected ? 'is-accent' : ''
                                }`}
                              >
                                {shape.type === 'rectangle' ? (
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                  </svg>
                                ) : shape.type === 'circle' ? (
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="9" />
                                  </svg>
                                ) : shape.type === 'line' ? (
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="4" y1="20" x2="20" y2="4" />
                                  </svg>
                                ) : shape.type === 'text' ? (
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="4 7 4 4 20 4 20 7" />
                                    <line x1="12" y1="4" x2="12" y2="20" />
                                  </svg>
                                ) : (
                                  <IconGlyph els={iconEls} size={13} />
                                )}
                              </span>

                              {/* Editable layer name */}
                              {isEditingShape ? (
                                <input
                                  ref={editShapeInputRef}
                                  type="text"
                                  value={editingShapeText}
                                  onChange={(e) => setEditingShapeText(e.target.value)}
                                  onBlur={() => commitRenameShape(shape.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRenameShape(shape.id);
                                    if (e.key === 'Escape') setEditingShapeId(null);
                                  }}
                                  className="cs-layer-inline-rename-input"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                <div className="cs-layer-name-wrapper">
                                  <span
                                    className="cs-layer-name-text"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      startRenameShape(shape, index);
                                    }}
                                    title="Double-click to rename"
                                  >
                                    {label}
                                  </span>
                                  {(isHovered || isSelected) && (
                                    <button
                                      type="button"
                                      className="cs-layer-rename-trigger-btn"
                                      title="Click to rename"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startRenameShape(shape, index);
                                      }}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: Quick Action Controls */}
                            <div className="cs-layer-actions">
                              {/* Z-Index Order buttons (hover only) */}
                              {(isHovered || isSelected) && !isEditingShape && (
                                <>
                                  <button
                                    type="button"
                                    className="cs-layer-mini-btn"
                                    title="Bring layer forward"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onBringForward(shape.id);
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className="cs-layer-mini-btn"
                                    title="Send layer backward"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSendBackward(shape.id);
                                    }}
                                  >
                                    ▼
                                  </button>
                                </>
                              )}

                              {/* Lock / Unlock Toggle */}
                              {(isHovered || isSelected || isLocked) && !isEditingShape && (
                                <button
                                  type="button"
                                  className={`cs-layer-action-icon-btn ${
                                    isLocked ? 'is-locked' : ''
                                  }`}
                                  title={isLocked ? 'Unlock layer' : 'Lock layer'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLock(shape.id);
                                  }}
                                >
                                  {isLocked ? (
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              {/* Visibility Toggle */}
                              {(isHovered || isSelected || isHidden) && !isEditingShape && (
                                <button
                                  type="button"
                                  className={`cs-layer-action-icon-btn ${
                                    isHidden ? 'is-hidden' : ''
                                  }`}
                                  title={isHidden ? 'Show layer' : 'Hide layer'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisibility(shape.id);
                                  }}
                                >
                                  {isHidden ? (
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                      <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              {/* Delete Button */}
                              {isHovered && !isEditingShape && (
                                <button
                                  type="button"
                                  className="cs-layer-delete-btn"
                                  title="Delete layer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteShape(shape.id);
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

          {/* Quick Add Page Button at end of list */}
          <button
            type="button"
            className="cs-layer-add-page-btn"
            onClick={onAddPage}
            title="Add a new page artboard to the canvas"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New Page</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
);
}
