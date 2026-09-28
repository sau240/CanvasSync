import React, { useState, useRef, useEffect } from 'react';
import type { CanvasShape } from '../store/room.store';
import { findShapeDef } from './Shapes';
import { IconGlyph, TOOLBAR_ICONS, type IconDef } from './Icons';

interface LayersPanelProps {
  shapes: CanvasShape[];
  selectedShapeId: string | null;
  onSelectShape: (id: string) => void;
  onDeleteShape: (id: string) => void;
  onRenameShape: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onCollapse: () => void;
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
  shapes,
  selectedShapeId,
  onSelectShape,
  onDeleteShape,
  onRenameShape,
  onToggleVisibility,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onCollapse,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [canvasFrameExpanded, setCanvasFrameExpanded] = useState(true);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (shape: CanvasShape, index: number) => {
    setEditingId(shape.id);
    setEditingText(shape.name || getDefaultLayerLabel(shape, index));
  };

  const commitRename = (id: string) => {
    if (editingText.trim()) {
      onRenameShape(id, editingText.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      commitRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Figma renders top-most layers at the top of the layer list
  const indexedShapes = shapes.map((s, idx) => ({ shape: s, index: idx + 1 }));
  const reversedList = [...indexedShapes].reverse();

  const filteredList = searchQuery.trim()
    ? reversedList.filter(({ shape, index }) =>
        getDefaultLayerLabel(shape, index).toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : reversedList;

  return (
    <aside className="cs-room-layers-panel">
      {/* Panel Header */}
      <div className="cs-layers-head">
        <div className="cs-layers-title-row">
          <span className="cs-layers-heading">LAYERS</span>
          <span className="cs-layers-count-badge">{shapes.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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

      {/* Layer Search Filter (when > 4 layers) */}
      {shapes.length > 4 && (
        <div className="cs-layers-search-box">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cs-layers-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="cs-layers-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Hierarchy / Layers Tree Body */}
      <div className="cs-layers-list">
        {shapes.length === 0 ? (
          <div className="cs-layers-empty">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <p>No layers on canvas</p>
            <span>Create a shape or text to populate layers</span>
          </div>
        ) : (
          <div className="cs-layer-tree-container">
            {/* Whiteboard Canvas Frame Node */}
            <div
              className="cs-layer-frame-node"
              onClick={() => setCanvasFrameExpanded((v) => !v)}
              title="Whiteboard Frame (1440 × 900)"
            >
              <span className={`cs-tree-chevron ${canvasFrameExpanded ? 'is-expanded' : ''}`}>
                ›
              </span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818CF8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              <span className="cs-frame-label">Whiteboard Canvas</span>
              <span className="cs-frame-dim">1440×900</span>
            </div>

            {/* Indented Children Layers List */}
            {canvasFrameExpanded && (
              <div className="cs-layer-tree-children">
                {filteredList.map(({ shape, index }) => {
                  const isSelected = shape.id === selectedShapeId;
                  const isHovered = shape.id === hoveredId;
                  const isEditing = shape.id === editingId;
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
                      {/* Left: Shape Icon + Name */}
                      <div className="cs-layer-item-left">
                        {/* Shape specific icon */}
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
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => commitRename(shape.id)}
                            onKeyDown={(e) => handleKeyDown(e, shape.id)}
                            className="cs-layer-inline-rename-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="cs-layer-name-text"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startRename(shape, index);
                            }}
                            title="Double-click to rename"
                          >
                            {label}
                          </span>
                        )}
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="cs-layer-actions">
                        {/* Z-Index Order buttons (hover only) */}
                        {(isHovered || isSelected) && !isEditing && (
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
                        {(isHovered || isSelected || isLocked) && !isEditing && (
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
                        {(isHovered || isSelected || isHidden) && !isEditing && (
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
                        {isHovered && !isEditing && (
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
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
