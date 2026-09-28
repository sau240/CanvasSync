import { useMemo, useState } from 'react';
import { IconGlyph, type IconDef } from './Icons';
import { SHAPE_CATEGORIES, findShapeDef } from './Shapes';

interface IconLibraryPanelProps {
  onPick: (icon: IconDef) => void;
  onClose: () => void;
  /** Most-recently-inserted shape ids, newest first. Lifted up to the
   *  parent so it survives the panel being closed and reopened. */
  recentIconIds?: string[];
}

const RECENT_LABEL = 'Recently Used';

export default function IconLibraryPanel({ onPick, onClose, recentIconIds = [] }: IconLibraryPanelProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const recentIcons = useMemo(
    () =>
      recentIconIds
        .map((id) => findShapeDef(id))
        .filter((icon): icon is IconDef => Boolean(icon))
        .slice(0, 12),
    [recentIconIds]
  );

  const q = query.trim().toLowerCase();

  const allCategoryNames = useMemo(() => ['All', ...SHAPE_CATEGORIES.map((c) => c.name)], []);

  const filteredCategories = useMemo(() => {
    let list = SHAPE_CATEGORIES;
    if (activeCategory !== 'All') {
      list = list.filter((cat) => cat.name === activeCategory);
    }
    if (!q) return list;
    return list
      .map((cat) => ({
        name: cat.name,
        icons: cat.icons.filter(
          (icon) =>
            icon.label.toLowerCase().includes(q) ||
            icon.id.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.icons.length > 0);
  }, [activeCategory, q]);

  const totalShapesCount = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.icons.length, 0);
  }, [filteredCategories]);

  return (
    <div className="cs-icon-popover" onClick={(e) => e.stopPropagation()}>
      <div className="cs-icon-popover-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Shapes & Icons Library</span>
          <span className="cs-icon-count-chip">{totalShapesCount} items</span>
        </div>
        <button type="button" className="cs-icon-popover-close" onClick={onClose} aria-label="Close Library">
          ✕
        </button>
      </div>

      <div className="cs-icon-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cs-search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="cs-icon-search"
          placeholder="Search 150+ shapes, connectors, icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button type="button" className="cs-search-clear" onClick={() => setQuery('')}>
            ✕
          </button>
        )}
      </div>

      {/* Category Navigation Pills */}
      <div className="cs-icon-category-tabs">
        {allCategoryNames.map((catName) => (
          <button
            key={catName}
            type="button"
            className={`cs-icon-tab-pill ${activeCategory === catName ? 'is-active' : ''}`}
            onClick={() => setActiveCategory(catName)}
          >
            {catName}
          </button>
        ))}
      </div>

      <div className="cs-icon-popover-body">
        {!q && activeCategory === 'All' && recentIcons.length > 0 && (
          <div className="cs-icon-category">
            <div className="cs-icon-category-head">
              <span>{RECENT_LABEL}</span>
              <span className="cs-cat-badge">{recentIcons.length}</span>
            </div>
            <div className="cs-icon-grid">
              {recentIcons.map((icon) => (
                <button
                  key={`recent-${icon.id}`}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', icon.id);
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'icon', iconId: icon.id }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="cs-icon-grid-item"
                  title={`${icon.label} (Drag to canvas or click)`}
                  onClick={() => onPick(icon)}
                >
                  <IconGlyph els={icon.els} size={20} />
                  <span className="cs-icon-grid-label">{icon.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCategories.map((cat) => (
          <div className="cs-icon-category" key={cat.name}>
            <div className="cs-icon-category-head">
              <span>{cat.name}</span>
              <span className="cs-cat-badge">{cat.icons.length}</span>
            </div>
            <div className="cs-icon-grid">
              {cat.icons.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', icon.id);
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'icon', iconId: icon.id }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="cs-icon-grid-item"
                  title={`${icon.label} (Drag to canvas or click)`}
                  onClick={() => onPick(icon)}
                >
                  <IconGlyph els={icon.els} size={20} />
                  <span className="cs-icon-grid-label">{icon.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="cs-empty-library">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No shapes or icons match "{query}"</p>
            <button type="button" className="cs-clear-search-btn" onClick={() => { setQuery(''); setActiveCategory('All'); }}>
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}