import { useState } from 'react';
import type { CanvasShape, ShadowStyle } from '../store/room.store';
import { PALETTE_COLORS } from '../store/room.store';

interface PropertiesPanelProps {
  shape: CanvasShape | null;
  recentColors: string[];
  onChange: (patch: Partial<CanvasShape>) => void;
  onUseColor: (color: string) => void;
  onExportSelectionPNG: () => void;
  onExportSelectionSVG: () => void;
  onExportCanvasPNG: () => void;
}

type SectionKey = 'layout' | 'image' | 'fill' | 'stroke' | 'colors' | 'shadow' | 'blur' | 'export';

// Icons and images are rendered as glyphs / bitmaps, so a "Fill" control isn't
// meaningful for them (same reasoning as for lines).
const hasFill = (shape: CanvasShape) => shape.type !== 'line' && shape.type !== 'icon' && shape.type !== 'image';

function Section({
  title,
  id,
  open,
  onToggle,
  children,
}: {
  title: string;
  id: SectionKey;
  open: boolean;
  onToggle: (id: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cs-props-section">
      <button className="cs-props-section-head" onClick={() => onToggle(id)} type="button">
        <span className={`cs-props-chevron ${open ? 'is-open' : ''}`}>›</span>
        <span>{title}</span>
      </button>
      {open && <div className="cs-props-section-body">{children}</div>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="cs-props-row">
      <label>{label}</label>
      <div className="cs-color-field">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cs-color-swatch-input"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cs-color-hex-input"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="cs-props-row">
      <label>{label}</label>
      <div className="cs-number-field">
        <input
          type="number"
          value={Math.round(value * 100) / 100}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="cs-number-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export default function PropertiesPanel({
  shape,
  recentColors,
  onChange,
  onUseColor,
  onExportSelectionPNG,
  onExportSelectionSVG,
  onExportCanvasPNG,
}: PropertiesPanelProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    layout: true,
    image: true,
    fill: true,
    stroke: false,
    colors: true,
    shadow: false,
    blur: false,
    export: true,
  });
  const [colorTarget, setColorTarget] = useState<'fill' | 'stroke'>('fill');

  const toggle = (id: SectionKey) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const applyColor = (color: string) => {
    if (!shape) return;
    onChange({ [colorTarget]: color } as Partial<CanvasShape>);
    onUseColor(color);
  };

  const shadow: ShadowStyle = shape?.shadow ?? {
    enabled: false,
    color: '#1c2430',
    blur: 8,
    offsetX: 0,
    offsetY: 4,
  };

  return (
    <aside className="cs-props-panel">
      {!shape ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span className="cs-props-heading">Document Canvas</span>
            <p className="cs-props-subtext">
              Select any element on the canvas to inspect, transform, and style properties.
            </p>
          </div>

          <div className="cs-canvas-info-card">
            <div className="cs-info-row">
              <span className="cs-info-label">Artboard Size</span>
              <span className="cs-info-val">1440 × 900 px</span>
            </div>
            <div className="cs-info-row">
              <span className="cs-info-label">Surface Type</span>
              <span className="cs-info-val">Whiteboard Canvas</span>
            </div>
            <div className="cs-info-row">
              <span className="cs-info-label">Multiplayer Engine</span>
              <span className="cs-info-val" style={{ color: '#34D399' }}>Live Real-time Sync</span>
            </div>
          </div>

          <div>
            <span className="cs-props-heading" style={{ display: 'block', marginBottom: 8 }}>
              Canvas Export
            </span>
            <button
              className="cs-secondary-action-btn"
              onClick={onExportCanvasPNG}
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Full Canvas (PNG)</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Component Name & Hierarchy Card */}
          <div className="cs-component-header-card">
            <div className="cs-component-type-row">
              <span className="cs-component-type-tag">
                {shape.type === 'rectangle'
                  ? 'Rectangle'
                  : shape.type === 'circle'
                  ? 'Ellipse'
                  : shape.type === 'image'
                  ? 'Image'
                  : shape.type === 'text'
                  ? 'Text'
                  : shape.type === 'line'
                  ? 'Line'
                  : 'Icon / Sticker'}
              </span>
              <span className="cs-component-level-tag">Level 2 (Canvas)</span>
            </div>

            <div className="cs-component-name-edit-wrap">
              <input
                type="text"
                className="cs-component-name-input"
                value={shape.name ?? ''}
                placeholder={
                  shape.type === 'image'
                    ? shape.fileName || 'Image'
                    : shape.type === 'text'
                    ? shape.text || 'Text'
                    : shape.type === 'circle'
                    ? 'Ellipse'
                    : shape.type.charAt(0).toUpperCase() + shape.type.slice(1)
                }
                onChange={(e) => onChange({ name: e.target.value } as Partial<CanvasShape>)}
                title="Edit component name"
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cs-component-name-edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          </div>

          <Section title="Layout" id="layout" open={open.layout} onToggle={toggle}>
            {shape.type !== 'line' && (
              <>
                <NumberField label="X" value={shape.x} onChange={(v) => onChange({ x: v } as Partial<CanvasShape>)} />
                <NumberField label="Y" value={shape.y} onChange={(v) => onChange({ y: v } as Partial<CanvasShape>)} />
              </>
            )}
            {(shape.type === 'rectangle' || shape.type === 'icon' || shape.type === 'image') && (
              <>
                <NumberField label="W" value={shape.width} onChange={(v) => onChange({ width: Math.max(1, v) } as Partial<CanvasShape>)} />
                <NumberField label="H" value={shape.height} onChange={(v) => onChange({ height: Math.max(1, v) } as Partial<CanvasShape>)} />
              </>
            )}
            {shape.type === 'circle' && (
              <NumberField label="Radius" value={shape.radius} onChange={(v) => onChange({ radius: Math.max(1, v) } as Partial<CanvasShape>)} />
            )}
            {shape.type === 'text' && (
              <NumberField label="Font size" value={shape.fontSize} onChange={(v) => onChange({ fontSize: Math.max(4, v) } as Partial<CanvasShape>)} />
            )}
            {shape.type === 'line' && (
              <>
                <NumberField label="X1" value={shape.x} onChange={(v) => onChange({ x: v } as Partial<CanvasShape>)} />
                <NumberField label="Y1" value={shape.y} onChange={(v) => onChange({ y: v } as Partial<CanvasShape>)} />
                <NumberField label="X2" value={shape.x2} onChange={(v) => onChange({ x2: v } as Partial<CanvasShape>)} />
                <NumberField label="Y2" value={shape.y2} onChange={(v) => onChange({ y2: v } as Partial<CanvasShape>)} />
              </>
            )}
            {(shape.type === 'rectangle' || shape.type === 'text' || shape.type === 'icon' || shape.type === 'image') && (
              <NumberField label="Rotation" value={shape.rotation} onChange={(v) => onChange({ rotation: v } as Partial<CanvasShape>)} suffix="°" />
            )}
            <NumberField
              label="Opacity"
              value={(shape.opacity ?? 1) * 100}
              min={0}
              max={100}
              onChange={(v) => onChange({ opacity: Math.min(1, Math.max(0, v / 100)) } as Partial<CanvasShape>)}
              suffix="%"
            />
          </Section>

          {shape.type === 'image' && (
            <Section title="Image" id="image" open={open.image} onToggle={toggle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.04)', padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <img
                    src={shape.src}
                    alt={shape.fileName || 'Imported'}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shape.fileName || 'Imported Image'}
                    </span>
                    <span style={{ display: 'block', fontSize: 10, color: '#94A3B8' }}>
                      {Math.round(shape.width)} × {Math.round(shape.height)} px
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <label
                    className="cs-btn cs-btn-secondary"
                    style={{ flex: 1, textAlign: 'center', cursor: 'pointer', padding: '6px 10px', fontSize: 11, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, margin: 0 }}
                  >
                    <span>Replace</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const src = evt.target?.result as string;
                          if (!src) return;
                          const img = new Image();
                          img.onload = () => {
                            onChange({
                              src,
                              fileName: file.name,
                              naturalWidth: img.naturalWidth,
                              naturalHeight: img.naturalHeight,
                            });
                          };
                          img.src = src;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    className="cs-btn cs-btn-secondary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 11, borderRadius: 6 }}
                    onClick={() => {
                      if (shape.naturalWidth && shape.naturalHeight) {
                        const maxDim = 400;
                        let w = shape.naturalWidth;
                        let h = shape.naturalHeight;
                        if (w > maxDim || h > maxDim) {
                          const ratio = Math.min(maxDim / w, maxDim / h);
                          w = Math.round(w * ratio);
                          h = Math.round(h * ratio);
                        }
                        onChange({ width: w, height: h });
                      } else {
                        const img = new Image();
                        img.onload = () => {
                          const maxDim = 400;
                          let w = img.naturalWidth;
                          let h = img.naturalHeight;
                          if (w > maxDim || h > maxDim) {
                            const ratio = Math.min(maxDim / w, maxDim / h);
                            w = Math.round(w * ratio);
                            h = Math.round(h * ratio);
                          }
                          onChange({ width: w, height: h, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
                        };
                        img.src = shape.src;
                      }
                    }}
                    title="Reset to natural aspect ratio"
                  >
                    Reset Ratio
                  </button>
                </div>
              </div>
            </Section>
          )}

          {hasFill(shape) && (
            <Section title="Fill" id="fill" open={open.fill} onToggle={toggle}>
              <ColorField
                label="Color"
                value={shape.fill ?? '#3654F4'}
                onChange={(v) => {
                  onChange({ fill: v } as Partial<CanvasShape>);
                  onUseColor(v);
                }}
              />
              <NumberField
                label="Opacity"
                value={(shape.fillOpacity ?? 1) * 100}
                min={0}
                max={100}
                onChange={(v) => onChange({ fillOpacity: Math.min(1, Math.max(0, v / 100)) } as Partial<CanvasShape>)}
                suffix="%"
              />
            </Section>
          )}

          <Section title="Stroke" id="stroke" open={open.stroke} onToggle={toggle}>
            <ColorField
              label="Color"
              value={shape.stroke ?? '#1F2937'}
              onChange={(v) => {
                onChange({ stroke: v } as Partial<CanvasShape>);
                onUseColor(v);
              }}
            />
            <NumberField
              label="Width"
              value={shape.strokeWidth ?? 0}
              min={0}
              max={40}
              onChange={(v) => onChange({ strokeWidth: Math.max(0, v) } as Partial<CanvasShape>)}
              suffix="px"
            />
            <NumberField
              label="Opacity"
              value={(shape.strokeOpacity ?? 1) * 100}
              min={0}
              max={100}
              onChange={(v) => onChange({ strokeOpacity: Math.min(1, Math.max(0, v / 100)) } as Partial<CanvasShape>)}
              suffix="%"
            />
          </Section>

          <Section title="Selected Colors" id="colors" open={open.colors} onToggle={toggle}>
            <div className="cs-color-target-toggle">
              <button
                type="button"
                className={colorTarget === 'fill' ? 'active' : ''}
                onClick={() => setColorTarget('fill')}
                disabled={!hasFill(shape)}
              >
                Fill
              </button>
              <button
                type="button"
                className={colorTarget === 'stroke' ? 'active' : ''}
                onClick={() => setColorTarget('stroke')}
              >
                Stroke
              </button>
            </div>
            <div className="cs-swatch-grid">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="cs-swatch"
                  style={{ background: c, borderColor: c === '#FFFFFF' ? '#d8dee3' : c }}
                  onClick={() => applyColor(c)}
                  title={c}
                />
              ))}
            </div>
            {recentColors.length > 0 && (
              <>
                <p className="cs-props-subtle">Recently used</p>
                <div className="cs-swatch-grid">
                  {recentColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="cs-swatch"
                      style={{ background: c, borderColor: c === '#FFFFFF' ? '#d8dee3' : c }}
                      onClick={() => applyColor(c)}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}
          </Section>

          <Section title="Shadow" id="shadow" open={open.shadow} onToggle={toggle}>
            <div className="cs-props-row">
              <label>Enabled</label>
              <input
                type="checkbox"
                checked={shadow.enabled}
                onChange={(e) => onChange({ shadow: { ...shadow, enabled: e.target.checked } } as Partial<CanvasShape>)}
              />
            </div>
            {shadow.enabled && (
              <>
                <ColorField
                  label="Color"
                  value={shadow.color}
                  onChange={(v) => onChange({ shadow: { ...shadow, color: v } } as Partial<CanvasShape>)}
                />
                <NumberField
                  label="Blur"
                  value={shadow.blur}
                  min={0}
                  max={60}
                  onChange={(v) => onChange({ shadow: { ...shadow, blur: Math.max(0, v) } } as Partial<CanvasShape>)}
                  suffix="px"
                />
                <NumberField
                  label="Offset X"
                  value={shadow.offsetX}
                  min={-60}
                  max={60}
                  onChange={(v) => onChange({ shadow: { ...shadow, offsetX: v } } as Partial<CanvasShape>)}
                  suffix="px"
                />
                <NumberField
                  label="Offset Y"
                  value={shadow.offsetY}
                  min={-60}
                  max={60}
                  onChange={(v) => onChange({ shadow: { ...shadow, offsetY: v } } as Partial<CanvasShape>)}
                  suffix="px"
                />
              </>
            )}
          </Section>

          <Section title="Blur" id="blur" open={open.blur} onToggle={toggle}>
            <NumberField
              label="Amount"
              value={shape.blur ?? 0}
              min={0}
              max={40}
              onChange={(v) => onChange({ blur: Math.max(0, v) } as Partial<CanvasShape>)}
              suffix="px"
            />
          </Section>

          <Section title="Export" id="export" open={open.export} onToggle={toggle}>
            <button className="cs-export-btn" onClick={onExportSelectionPNG} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export selection as PNG</span>
            </button>
            <button className="cs-export-btn" onClick={onExportSelectionSVG} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span>Export selection as SVG</span>
            </button>
            <button className="cs-export-btn" onClick={onExportCanvasPNG} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Export whole canvas as PNG</span>
            </button>
          </Section>
        </>
      )}
    </aside>
  );
}