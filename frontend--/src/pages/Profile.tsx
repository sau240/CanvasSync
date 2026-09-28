import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore, type ActiveSection } from '../store/settings.store';
import '../styles/theme.css';

const AVATAR_COLORS = ['#3654F4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
const getAvatarBg = (val?: number | string) => {
  if (!val) return AVATAR_COLORS[0];
  const code = typeof val === 'number' ? val : String(val).charCodeAt(0);
  return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
};

export default function Profile() {
  const { user } = useAuthStore();
  const { openDrawer, customEmail, is2FAEnabled, subscriptionPlan, usage, apiKeys } = useSettingsStore();
  const navigate = useNavigate();

  // Auto-open drawer when visiting /profile page
  useEffect(() => {
    openDrawer('account');
  }, [openDrawer]);

  const handleOpenSection = (section: ActiveSection) => {
    openDrawer(section);
  };

  const displayEmail = customEmail || user?.email || 'user@example.com';

  return (
    <div className="cs-bento-shell">
      {/* Profile & Settings Sliding Drawer */}
      <ProfileDrawer />

      {/* Ambient Glowing Background Mesh Orbs */}
      <div className="cs-bento-bg-mesh">
        <div className="cs-mesh-orb cs-orb-1" />
        <div className="cs-mesh-orb cs-orb-2" />
        <div className="cs-mesh-orb cs-orb-3" />
      </div>

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
            <span className="cs-bento-logo-text">Profile & Settings Center</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="cs-btn-secondary" onClick={() => openDrawer('account')}>
              Open Settings Drawer (50%–75%)
            </button>
            <button className="cs-bento-primary-btn" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="cs-bento-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        {/* User Hero Bento Card */}
        <div className="cs-bento-tile" style={{ padding: '36px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                className="cs-bento-avatar"
                style={{
                  width: '84px',
                  height: '84px',
                  fontSize: '32px',
                  background: getAvatarBg(user?.user_id),
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                {(user?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-heading, inherit)', fontWeight: '700' }}>
                    {user?.username ?? 'User'}
                  </h2>
                  <span className="cs-drawer-tier-badge">{subscriptionPlan}</span>
                  {is2FAEnabled && (
                    <span className="cs-status-badge cs-badge-active">2FA Secured</span>
                  )}
                </div>
                <p style={{ color: '#94A3B8', margin: '8px 0 0', fontSize: '15px' }}>
                  {displayEmail} • User ID #{user?.user_id ?? '1'} • Status: <span style={{ color: '#10B981' }}>Active</span>
                </p>
              </div>
            </div>

            <button
              className="cs-bento-primary-btn"
              style={{ padding: '12px 24px', fontSize: '15px' }}
              onClick={() => openDrawer('account')}
            >
              Open Full Settings Sidebar 
            </button>
          </div>
        </div>

        {/* 4 Feature Hub Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {/* Account & Security Hub */}
          <div
            className="cs-bento-tile"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onClick={() => handleOpenSection('account')}
          >
            <div className="cs-card-item-icon" style={{ marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: 'var(--text-heading, inherit)' }}>Account & Security</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              Update email, change passwords, and configure 2FA authentication.
            </p>
          </div>

          {/* User Preferences Hub */}
          <div
            className="cs-bento-tile"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onClick={() => handleOpenSection('preferences')}
          >
            <div className="cs-card-item-icon" style={{ marginBottom: '16px', color: '#A855F7', background: 'rgba(168, 85, 247, 0.12)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: 'var(--text-heading, inherit)' }}>User Preferences</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              Theme modes (Dark/Light/System), notifications, and UI scaling.
            </p>
          </div>

          {/* Workspace & Data Hub */}
          <div
            className="cs-bento-tile"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onClick={() => handleOpenSection('workspace')}
          >
            <div className="cs-card-item-icon" style={{ marginBottom: '16px', color: '#10B981', background: 'rgba(16, 185, 129, 0.12)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: 'var(--text-heading, inherit)' }}>Workspace & Data</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              {usage.activeBoards}/{usage.maxBoards} Boards, plan billing, and default export formats.
            </p>
          </div>

          {/* Developer Hub */}
          <div
            className="cs-bento-tile"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onClick={() => handleOpenSection('developer')}
          >
            <div className="cs-card-item-icon" style={{ marginBottom: '16px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: 'var(--text-heading, inherit)' }}>Developer & Danger</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              {apiKeys.length} Personal access tokens, API credentials, and danger zone.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}