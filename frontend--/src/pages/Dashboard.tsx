import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsApi } from '../api/rooms.api';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import '../styles/theme.css';
import type { Room } from '../types/room.types';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { openDrawer } = useSettingsStore();
  const navigate = useNavigate();

  const [personalWorkspace, setPersonalWorkspace] = useState<Room | null>(null);
  const [ownedRooms, setOwnedRooms] = useState<Room[]>([]);
  const [sharedRooms, setSharedRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinPreview, setJoinPreview] = useState<Room | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [personal, rooms] = await Promise.all([
          roomsApi.getPersonalWorkspace(),
          roomsApi.listRooms(),
        ]);

        if (cancelled) return;

        setPersonalWorkspace(personal);

        const userId = user?.user_id;
        const owned = rooms.filter((r) => r.owner_id === userId);
        const shared = rooms.filter((r) => r.owner_id !== userId);

        setOwnedRooms(owned);
        setSharedRooms(shared);
      } catch {
        if (!cancelled) setError("Couldn't load your workspaces. Try refreshing.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCapacity, setCreateCapacity] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  const openCreateModal = () => {
    setCreateTitle('');
    setCreateCapacity('10');
    setCreateModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const title = createTitle.trim();
    if (!title) {
      setCreateModalError('Please enter a room name.');
      return;
    }

    const capacity = Number(createCapacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setCreateModalError('Capacity must be a positive whole number.');
      return;
    }

    setIsCreating(true);
    setCreateModalError(null);

    try {
      const room = await roomsApi.createRoom({ roomTitle: title, capacity });
      setOwnedRooms((prev) => [room, ...prev]);
      setIsCreateModalOpen(false);
      navigate(`/room/${room.room_id}`);
    } catch {
      setCreateModalError("Couldn't create the room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinPreview = async (e: FormEvent) => {
    e.preventDefault();

    const roomId = joinRoomId.trim();
    if (!roomId) return;

    setJoinError(null);
    setIsJoining(true);
    setJoinPreview(null);

    try {
      const room = await roomsApi.getRoomById(roomId);
      const userId = user?.user_id;
      if (userId && room.owner_id === userId) {
        navigate(`/room/${roomId}`);
        return;
      }
      setJoinPreview(room);
    } catch {
      setJoinError("Couldn't find a room with that ID. Double-check it and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const openRoom = (roomId: string) => navigate(`/room/${roomId}`);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const copyRoomId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setToastMessage('Room ID copied to clipboard!');
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleCreateWithTemplate = (templateName: string) => {
    setCreateTitle(templateName);
    setCreateCapacity('10');
    setCreateModalError(null);
    setIsCreateModalOpen(true);
  };

  const AVATAR_COLORS = ['#3654F4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
  const getAvatarBg = (val?: number | string) => {
    if (!val) return AVATAR_COLORS[0];
    const code = typeof val === 'number' ? val : String(val).charCodeAt(0);
    return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
  };

  // Filtered rooms based on activeTab and searchQuery
  const q = searchQuery.toLowerCase().trim();
  const filteredOwned = ownedRooms.filter(
    (r) => !q || r.room_title.toLowerCase().includes(q) || r.room_id.toLowerCase().includes(q)
  );
  const filteredShared = sharedRooms.filter(
    (r) =>
      !q ||
      r.room_title.toLowerCase().includes(q) ||
      r.room_id.toLowerCase().includes(q) ||
      (r.owner_username && r.owner_username.toLowerCase().includes(q))
  );

  const totalBoardsCount = ownedRooms.length + sharedRooms.length + (personalWorkspace ? 1 : 0);

  return (
    <div className="cs-bento-shell">
      {/* Profile & Settings Sliding Drawer (50%–75% width) */}
      <ProfileDrawer />

      {/* Ambient Glowing Background Mesh Orbs */}
      <div className="cs-bento-bg-mesh">
        <div className="cs-mesh-orb cs-orb-1" />
        <div className="cs-mesh-orb cs-orb-2" />
        <div className="cs-mesh-orb cs-orb-3" />
      </div>

      {/* Floating Glassmorphic Header */}
      <header className="cs-bento-header">
        <div className="cs-bento-header-inner">
          <div className="cs-bento-brand">
            <div className="cs-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="2" fill="#3B82F6" />
                <rect x="14" y="3" width="7" height="7" rx="2" fill="#8B5CF6" />
                <rect x="3" y="14" width="7" height="7" rx="2" fill="#10B981" />
                <rect x="14" y="14" width="7" height="7" rx="2" fill="#F59E0B" />
              </svg>
            </div>
            <span className="cs-bento-logo-text">
              CanvasSync <span className="cs-bento-studio-tag">STUDIO</span>
            </span>
          </div>

          {/* Search bar with Keyboard Shortcut badge */}
          <div className="cs-bento-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search boards, templates & rooms…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery('')} className="cs-search-clear">
                ✕
              </button>
            ) : (
              <span className="cs-search-shortcut">⌘K</span>
            )}
          </div>

          <div className="cs-bento-header-actions">
            <button className="cs-bento-primary-btn" onClick={openCreateModal}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Room</span>
            </button>

            {/* Profile Pill -> Opens Profile Drawer */}
            <button
              className="cs-bento-user-pill" 
              onClick={() => openDrawer('account')} 
              title="Open Profile & Settings Drawer"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="cs-bento-avatar" style={{ background: getAvatarBg(user?.user_id) }}>
                {(user?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <span className="cs-bento-username">{user?.username ?? 'User'}</span>
            </button>
        
            <button className="cs-bento-logout-btn" onClick={logout} title="Sign out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Expansive Viewport Content */}
      <main className="cs-bento-container">
        {error && <div className="cs-error" style={{ marginBottom: 20 }}>{error}</div>}

        {isLoading ? (
          <div className="cs-loading-state">
            <div className="cs-spinner" />
            <p>Initializing your real-time creative suite…</p>
          </div>
        ) : (
          <>
            {/* Top Bento Hero Grid (12 Columns) */}
            <section className="cs-bento-hero-grid">
              {/* Tile 1: Main Feature Bento Banner (Span 8) */}
              <div className="cs-bento-tile cs-tile-hero">
                <div className="cs-tile-hero-content">
                  <div className="cs-hero-badge">
                    <span className="cs-pulse-dot" />
                    <span>Real-Time Collaborative Vector Studio</span>
                  </div>
                  <h1 className="cs-hero-title">
                    Where imagination becomes <span className="cs-gradient-text">vector reality.</span>
                  </h1>
                  <p className="cs-hero-desc">
                    Design infinite flowcharts, UI wireframes, system diagrams, and brainstorms with your team in ultra-responsive 60 FPS real-time sync.
                  </p>

                  <div className="cs-hero-action-buttons">
                    <button className="cs-hero-btn-primary" onClick={openCreateModal}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Create Team Room</span>
                    </button>

                    {personalWorkspace && (
                      <button className="cs-hero-btn-secondary" onClick={() => openRoom(personalWorkspace.room_id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                        <span>Personal Workspace</span>
                      </button>
                    )}

                    <button
                      className="cs-hero-btn-ghost"
                      onClick={() => {
                        const el = document.getElementById('bento-join-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      <span>Enter with ID</span>
                    </button>
                  </div>
                </div>

                {/* Animated Interactive Vector Demo Snippet in Hero Tile */}
                <div className="cs-tile-hero-preview">
                  <div className="cs-preview-canvas-box">
                    <div className="cs-preview-grid-overlay" />
                    {/* Simulated live vector node cards */}
                    <div className="cs-mock-node cs-node-1">
                      <span className="cs-mock-tag">✦ Core Engine</span>
                      <strong>CanvasSync v2.4</strong>
                    </div>
                    <div className="cs-mock-node cs-node-2">
                      <span className="cs-mock-tag">⚡ Flowchart</span>
                      <strong>WebSocket Hub</strong>
                    </div>
                    <div className="cs-mock-node cs-node-3">
                      <span className="cs-mock-tag">🎨 UI Mockup</span>
                      <strong>Design System</strong>
                    </div>
                    {/* Simulated live teammate cursors */}
                    <div className="cs-mock-cursor cs-cursor-alex">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#3B82F6">
                        <path d="M4 4l16 7.2-7.2 2.4-2.4 7.2L4 4z" />
                      </svg>
                      <span>Alex (Designer)</span>
                    </div>
                    <div className="cs-mock-cursor cs-cursor-sarah">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#10B981">
                        <path d="M4 4l16 7.2-7.2 2.4-2.4 7.2L4 4z" />
                      </svg>
                      <span>Sarah (Dev)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tile 2: Live Pulse & Metrics Widget (Span 4) */}
              <div className="cs-bento-tile cs-tile-metrics">
                <div className="cs-tile-head">
                  <span className="cs-tile-label">Live Workspace Pulse</span>
                  <span className="cs-live-pill">
                    <span className="cs-pulse-dot-green" /> 60 FPS Sync
                  </span>
                </div>

                <div className="cs-metrics-grid">
                  <div className="cs-metric-card">
                    <span className="cs-metric-num">{totalBoardsCount}</span>
                    <span className="cs-metric-label">Active Workspaces</span>
                  </div>
                  <div className="cs-metric-card">
                    <span className="cs-metric-num">50+</span>
                    <span className="cs-metric-label">Vector Shapes</span>
                  </div>
                  <div className="cs-metric-card">
                    <span className="cs-metric-num">0 ms</span>
                    <span className="cs-metric-label">Broadcast Delay</span>
                  </div>
                  <div className="cs-metric-card">
                    <span className="cs-metric-num">100%</span>
                    <span className="cs-metric-label">SVG Vector Output</span>
                  </div>
                </div>

                <div className="cs-pro-tip-box">
                  <div className="cs-tip-icon">✨</div>
                  <div className="cs-tip-content">
                    <strong>Figma Drag & Drop</strong>
                    <p>Drag shapes directly from the toolbar or shape library right onto the canvas.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Tile 3: Quick Start Bento Templates Section */}
            <section className="cs-templates-section">
              <div className="cs-section-header">
                <div>
                  <h2 className="cs-section-title">Quick Start Canvas Templates</h2>
                  <p className="cs-section-subtitle">Jumpstart your brainstorm, UI wireframe, or flowchart with one click</p>
                </div>
              </div>

              <div className="cs-templates-grid">
                <button className="cs-template-bento-card card-flow" onClick={() => handleCreateWithTemplate('System Architecture Flow')}>
                  <div className="cs-template-glow" />
                  <div className="cs-template-badge">Flowchart</div>
                  <div className="cs-template-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="6" height="6" rx="1" />
                      <rect x="15" y="15" width="6" height="6" rx="1" />
                      <path d="M6 9v3a3 3 0 0 0 3 3h6" />
                    </svg>
                  </div>
                  <h3>System Architecture</h3>
                  <p>Model backend nodes, microservices, and network flows</p>
                  <span className="cs-template-action">Start Template →</span>
                </button>

                <button className="cs-template-bento-card card-wireframe" onClick={() => handleCreateWithTemplate('Mobile & Web Wireframe')}>
                  <div className="cs-template-glow" />
                  <div className="cs-template-badge">Wireframe</div>
                  <div className="cs-template-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </div>
                  <h3>UI/UX Wireframing</h3>
                  <p>Draft user journeys, layouts, mobile screens & modals</p>
                  <span className="cs-template-action">Start Template →</span>
                </button>

                <button className="cs-template-bento-card card-sprint" onClick={() => handleCreateWithTemplate('Team Sprint & Brainstorm')}>
                  <div className="cs-template-glow" />
                  <div className="cs-template-badge">Sprint</div>
                  <div className="cs-template-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="M4.93 4.93l2.83 2.83" />
                      <path d="M16.24 16.24l2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                    </svg>
                  </div>
                  <h3>Team Brainstorm</h3>
                  <p>Collaborative idea dump, stickies, and sprint planning</p>
                  <span className="cs-template-action">Start Template →</span>
                </button>

                <button className="cs-template-bento-card card-diagram" onClick={() => handleCreateWithTemplate('Vector Brand & Graphics')}>
                  <div className="cs-template-glow" />
                  <div className="cs-template-badge">Design</div>
                  <div className="cs-template-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="12 8 8 12 12 16 16 12 12 8" />
                    </svg>
                  </div>
                  <h3>Vector Assets & Layout</h3>
                  <p>Design custom icons, badges, banners, and vector assets</p>
                  <span className="cs-template-action">Start Template →</span>
                </button>
              </div>
            </section>

            {/* Tile 4: Workspace Boards Hub */}
            <section className="cs-boards-section">
              <div className="cs-dash-toolbar">
                <div className="cs-tab-pills">
                  <button
                    className={`cs-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Canvases ({totalBoardsCount})
                  </button>
                  <button
                    className={`cs-tab-pill ${activeTab === 'owned' ? 'active' : ''}`}
                    onClick={() => setActiveTab('owned')}
                  >
                    Rooms I Own ({ownedRooms.length + (personalWorkspace ? 1 : 0)})
                  </button>
                  <button
                    className={`cs-tab-pill ${activeTab === 'shared' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shared')}
                  >
                    Shared With Me ({sharedRooms.length})
                  </button>
                </div>

                <div className="cs-view-toggles">
                  <button
                    className={`cs-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Bento Grid View"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    className={`cs-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Boards Grid View */}
              {viewMode === 'grid' ? (
                <div className="cs-boards-grid">
                  {/* Personal Workspace Card */}
                  {personalWorkspace && (activeTab === 'all' || activeTab === 'owned') && !q && (
                    <div className="cs-board-card cs-card-personal" onClick={() => openRoom(personalWorkspace.room_id)}>
                      <div className="cs-board-thumb cs-thumb-personal">
                        <div className="cs-thumb-pattern" />
                        <div className="cs-thumb-decor-icon">🔒</div>
                        <span className="cs-board-badge badge-personal">Private Workspace</span>
                      </div>
                      <div className="cs-board-content">
                        <h3>{personalWorkspace.room_title}</h3>
                        <p>Only you have access to this private draft space until you share it.</p>
                        <div className="cs-board-footer">
                          <span className="cs-board-role">Owner (You)</span>
                          <span className="cs-open-link">Open Canvas →</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Owned Collaboration Rooms */}
                  {(activeTab === 'all' || activeTab === 'owned') &&
                    filteredOwned.map((room) => (
                      <div
                        key={room.room_id}
                        className="cs-board-card"
                        onClick={() => openRoom(room.room_id)}
                      >
                        <div className="cs-board-thumb cs-thumb-collab">
                          <div className="cs-thumb-pattern" />
                          <div className="cs-thumb-decor-icon">⚡</div>
                          <span className="cs-board-badge badge-collab">Collaborative</span>
                          <button
                            type="button"
                            className="cs-card-copy-btn"
                            onClick={(e) => copyRoomId(e, room.room_id)}
                            title="Copy Room ID"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                        <div className="cs-board-content">
                          <h3>{room.room_title}</h3>
                          <p className="cs-room-subtext">ID: {room.room_id.slice(0, 18)}…</p>
                          <div className="cs-board-footer">
                            <span className="cs-board-role">Created by you</span>
                            <span className="cs-open-link">Open Canvas →</span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Shared Rooms */}
                  {(activeTab === 'all' || activeTab === 'shared') &&
                    filteredShared.map((room) => (
                      <div
                        key={room.room_id}
                        className="cs-board-card"
                        onClick={() => openRoom(room.room_id)}
                      >
                        <div className="cs-board-thumb cs-thumb-shared">
                          <div className="cs-thumb-pattern" />
                          <div className="cs-thumb-decor-icon">🤝</div>
                          <span className="cs-board-badge badge-shared">Shared</span>
                          <button
                            type="button"
                            className="cs-card-copy-btn"
                            onClick={(e) => copyRoomId(e, room.room_id)}
                            title="Copy Room ID"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                        <div className="cs-board-content">
                          <h3>{room.room_title}</h3>
                          <p className="cs-room-subtext">Shared by {room.owner_username ?? 'Teammate'}</p>
                          <div className="cs-board-footer">
                            <span className="cs-board-role">Collaborator</span>
                            <span className="cs-open-link">Open Canvas →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                /* Sleek List View */
                <div className="cs-boards-list">
                  {personalWorkspace && (activeTab === 'all' || activeTab === 'owned') && !q && (
                    <div className="cs-list-row" onClick={() => openRoom(personalWorkspace.room_id)}>
                      <div className="cs-list-icon-badge" style={{ background: '#EDE9FE', color: '#6366F1' }}>
                        🔒
                      </div>
                      <div className="cs-list-info">
                        <strong>{personalWorkspace.room_title}</strong>
                        <span>Private workspace draft</span>
                      </div>
                      <span className="cs-board-badge badge-personal">Private</span>
                      <span className="cs-open-link">Open Canvas →</span>
                    </div>
                  )}

                  {(activeTab === 'all' || activeTab === 'owned') &&
                    filteredOwned.map((room) => (
                      <div key={room.room_id} className="cs-list-row" onClick={() => openRoom(room.room_id)}>
                        <div className="cs-list-icon-badge" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                          ⚡
                        </div>
                        <div className="cs-list-info">
                          <strong>{room.room_title}</strong>
                          <span>ID: {room.room_id}</span>
                        </div>
                        <span className="cs-board-badge badge-collab">Owned</span>
                        <button
                          type="button"
                          className="cs-card-copy-btn"
                          onClick={(e) => copyRoomId(e, room.room_id)}
                          title="Copy Room ID"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <span className="cs-open-link">Open Canvas →</span>
                      </div>
                    ))}

                  {(activeTab === 'all' || activeTab === 'shared') &&
                    filteredShared.map((room) => (
                      <div key={room.room_id} className="cs-list-row" onClick={() => openRoom(room.room_id)}>
                        <div className="cs-list-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
                          🤝
                        </div>
                        <div className="cs-list-info">
                          <strong>{room.room_title}</strong>
                          <span>By {room.owner_username ?? 'Teammate'}</span>
                        </div>
                        <span className="cs-board-badge badge-shared">Shared</span>
                        <button
                          type="button"
                          className="cs-card-copy-btn"
                          onClick={(e) => copyRoomId(e, room.room_id)}
                          title="Copy Room ID"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <span className="cs-open-link">Open Canvas →</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Empty State when no rooms match */}
              {filteredOwned.length === 0 && filteredShared.length === 0 && (!personalWorkspace || activeTab === 'shared' || q) && (
                <div className="cs-dash-empty">
                  <div className="cs-dash-empty-icon">🎨</div>
                  <h3>{q ? `No rooms match "${searchQuery}"` : 'No collaboration rooms yet'}</h3>
                  <p>
                    {q
                      ? 'Try searching with a different room name or room ID.'
                      : 'Create a shared room to invite teammates and design vectors together.'}
                  </p>
                  {!q && (
                    <button className="cs-bento-primary-btn" onClick={openCreateModal} style={{ margin: '16px auto 0' }}>
                      Create Collaboration Room
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Tile 5: Bento "Instant Access / Fast Join" Terminal */}
            <section id="bento-join-section" className="cs-bento-join-card">
              <div className="cs-join-card-glow" />
              <div className="cs-join-card-inner">
                <div className="cs-join-card-header">
                  <div className="cs-join-badge-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <h3>Direct Room Access Terminal</h3>
                    <p>Have an invitation ID? Enter the UUID key to connect directly to the live board.</p>
                  </div>
                </div>

                <form className="cs-bento-join-form" onSubmit={handleJoinPreview}>
                  <div className="cs-bento-input-wrap">
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => {
                        setJoinRoomId(e.target.value);
                        if (joinError) setJoinError(null);
                        setJoinPreview(null);
                      }}
                      placeholder="Paste Room ID (e.g., 550624ec-d47f-474a-a15e...)"
                      aria-label="Room ID"
                    />
                  </div>
                  <button
                    type="submit"
                    className="cs-bento-join-btn"
                    disabled={isJoining || !joinRoomId.trim()}
                  >
                    {isJoining ? 'Verifying Access…' : 'Connect to Board →'}
                  </button>
                </form>

                {joinError && <div className="cs-error" style={{ marginTop: 14 }}>{joinError}</div>}

                {joinPreview && (
                  <div className="cs-bento-preview-pill">
                    <div className="cs-preview-left">
                      <div className="cs-preview-icon">✨</div>
                      <div>
                        <h4>{joinPreview.room_title}</h4>
                        <span>Owner: <strong>{joinPreview.owner_username ?? 'Unknown'}</strong></span>
                      </div>
                    </div>
                    {joinPreview.your_role ? (
                      <button
                        className="cs-bento-primary-btn"
                        onClick={() => openRoom(joinPreview.room_id)}
                      >
                        Enter Room Canvas →
                      </button>
                    ) : (
                      <span className="cs-badge-noaccess">Access Permission Required</span>
                    )}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div
          className="cs-modal-backdrop"
          onClick={() => !isCreating && setIsCreateModalOpen(false)}
        >
          <div
            className="cs-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-modal-head">
              <div>
                <h2 className="cs-modal-title">Create Collaboration Room</h2>
                <p className="cs-modal-subtitle">
                  Set up a shared canvas for real-time collaboration with your team.
                </p>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => !isCreating && setIsCreateModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="cs-field" style={{ marginBottom: 16 }}>
                <label htmlFor="modalRoomTitle">Room Name</label>
                <input
                  id="modalRoomTitle"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Design Sprint, Brainstorming"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="cs-field" style={{ marginBottom: 20 }}>
                <label htmlFor="modalCapacity">Participant Capacity</label>
                <input
                  id="modalCapacity"
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={createCapacity}
                  onChange={(e) => setCreateCapacity(e.target.value)}
                  disabled={isCreating}
                />
                <span style={{ fontSize: 12, color: '#8A93A0', marginTop: 4 }}>
                  Maximum number of team members who can join simultaneously.
                </span>
              </div>

              {createModalError && (
                <div className="cs-error" style={{ marginBottom: 16 }}>
                  {createModalError}
                </div>
              )}

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="cs-btn cs-btn-ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cs-btn cs-btn-primary"
                  style={{ width: 'auto', minWidth: 120 }}
                  disabled={isCreating || !createTitle.trim()}
                >
                  {isCreating ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
