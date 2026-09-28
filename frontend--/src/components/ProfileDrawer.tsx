import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/auth.store';
import {
  useSettingsStore,
  type ExportDpi,
  type ExportFormat,
  type FontSize,
} from '../store/settings.store';

const AVATAR_COLORS = ['#3654F4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
const getAvatarBg = (val?: number | string) => {
  if (!val) return AVATAR_COLORS[0];
  const code = typeof val === 'number' ? val : String(val).charCodeAt(0);
  return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
};

export default function ProfileDrawer() {
  const { user, logout } = useAuthStore();
  const {
    isDrawerOpen,
    drawerWidthPercent,
    activeSection,
    customEmail,
    is2FAEnabled,
    twoFactorSecret,
    sessions,
    theme,
    notifications,
    accessibility,
    subscriptionPlan,
    usage,
    exportPreferences,
    apiKeys,
    closeDrawer,
    setDrawerWidthPercent,
    setActiveSection,
    updateEmail,
    set2FAEnabled,
    regenerate2FASecret,
    revokeSession,
    revokeAllOtherSessions,
    setTheme,
    updateNotifications,
    updateAccessibility,
    setSubscriptionPlan,
    updateExportPreferences,
    generateApiKey,
    revokeApiKey,
    clearAllPersonalData,
  } = useSettingsStore();

  // Local modal states
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');
  const [emailErrorMsg, setEmailErrorMsg] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFACodeInput, setTwoFACodeInput] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [keyNameInput, setKeyNameInput] = useState('');
  const [keyScopeInput, setKeyScopeInput] = useState<'read' | 'read-write' | 'admin'>('read-write');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentDisplayEmail = customEmail || user?.email || 'user@example.com';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Handle ESC key to close modal/drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        if (
          isEditEmailOpen ||
          isPasswordModalOpen ||
          is2FAModalOpen ||
          isPlanModalOpen ||
          isNewKeyModalOpen ||
          isDeleteModalOpen ||
          isClearDataModalOpen
        ) {
          setIsEditEmailOpen(false);
          setIsPasswordModalOpen(false);
          setIs2FAModalOpen(false);
          setIsPlanModalOpen(false);
          setIsNewKeyModalOpen(false);
          setIsDeleteModalOpen(false);
          setIsClearDataModalOpen(false);
        } else {
          closeDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDrawerOpen,
    isEditEmailOpen,
    isPasswordModalOpen,
    is2FAModalOpen,
    isPlanModalOpen,
    isNewKeyModalOpen,
    isDeleteModalOpen,
    isClearDataModalOpen,
    closeDrawer,
  ]);

  const handleUpdateEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailErrorMsg('');
    setEmailSuccessMsg('');
    const clean = newEmailInput.trim();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setEmailErrorMsg('Please enter a valid email address.');
      return;
    }
    try {
      setIsSubmittingEmail(true);
      await updateEmail(clean);
      setEmailSuccessMsg('Email updated successfully!');
      showToast(`Email updated to ${clean}`);
      setTimeout(() => {
        setEmailSuccessMsg('');
        setIsEditEmailOpen(false);
      }, 1000);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to update email. Please try again.';
      setEmailErrorMsg(errMsg);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleChangePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPwd.trim()) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdSuccess('Password changed successfully!');
    showToast('Password changed successfully!');
    setTimeout(() => {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess('');
      setIsPasswordModalOpen(false);
    }, 900);
  };

  const handle2FAToggle = () => {
    if (is2FAEnabled) {
      if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
        set2FAEnabled(false);
        showToast('Two-Factor Authentication disabled.');
      }
    } else {
      regenerate2FASecret();
      setTwoFACodeInput('');
      setTwoFAError('');
      setIs2FAModalOpen(true);
    }
  };

  const handleVerify2FASubmit = (e: FormEvent) => {
    e.preventDefault();
    if (twoFACodeInput.trim().length !== 6) {
      setTwoFAError('Please enter a valid 6-digit verification code.');
      return;
    }
    set2FAEnabled(true);
    setIs2FAModalOpen(false);
    showToast('Two-Factor Authentication successfully enabled!');
  };

  const handleGenerateKeySubmit = (e: FormEvent) => {
    e.preventDefault();
    const item = generateApiKey(keyNameInput, keyScopeInput);
    setGeneratedKeyResult(item.token);
    setKeyNameInput('');
    showToast(`Generated token "${item.name}"`);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const handleDeleteAccount = () => {
    const requiredPhrase = user?.username || 'DELETE';
    if (deleteConfirmText !== requiredPhrase) {
      alert(`Please type "${requiredPhrase}" exactly to confirm.`);
      return;
    }
    clearAllPersonalData();
    setIsDeleteModalOpen(false);
    closeDrawer();
    logout();
    window.location.href = '/login';
  };

  const handleClearData = () => {
    clearAllPersonalData();
    setIsClearDataModalOpen(false);
    showToast('Personal data and cache cleared.');
  };

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      <div className="cs-drawer-overlay" onClick={closeDrawer}>
        {/* Drawer Sliding Panel */}
        <aside
          className="cs-drawer-panel"
          style={{ width: `${drawerWidthPercent}%` }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Profile and Settings Drawer"
        >
          {/* Floating Toast inside Drawer */}
          {toastMessage && <div className="cs-drawer-toast">{toastMessage}</div>}

          {/* Drawer Header */}
          <header className="cs-drawer-header">
            <div className="cs-drawer-user-info">
              <div
                className="cs-drawer-avatar"
                style={{ background: getAvatarBg(user?.user_id) }}
              >
                {(user?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="cs-drawer-user-meta">
                <div className="cs-drawer-user-name-row">
                  <h2 className="cs-drawer-username">{user?.username ?? 'User'}</h2>
                  <span className="cs-drawer-tier-badge">{subscriptionPlan}</span>
                  {is2FAEnabled && (
                    <span className="cs-status-badge cs-badge-active" style={{ fontSize: '10px' }}>2FA</span>
                  )}
                </div>
                <p className="cs-drawer-user-sub">
                  <span className="cs-pulse-dot-green" />
                  {currentDisplayEmail} • ID: #{user?.user_id ?? '1'}
                </p>
              </div>
            </div>

            <div className="cs-drawer-header-controls">
              {/* Width Toggle Button (55% ↔ 75%) */}
              <button
                type="button"
                className="cs-drawer-icon-btn cs-width-toggle-btn"
                onClick={() => setDrawerWidthPercent(drawerWidthPercent >= 70 ? 55 : 75)}
                title={drawerWidthPercent >= 70 ? 'Shrink drawer width (55%)' : 'Expand drawer width (75%)'}
              >
                {drawerWidthPercent >= 70 ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 14h6v6" />
                    <path d="M20 10h-6V4" />
                    <path d="M14 10l7-7" />
                    <path d="M10 14L3 21" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                className="cs-drawer-icon-btn cs-close-drawer-btn"
                onClick={closeDrawer}
                title="Close drawer (Esc)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {/* Navigation Tab Bar */}
          <nav className="cs-drawer-nav">
            <button
              type="button"
              className={`cs-drawer-tab ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSection('account')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Account & Security</span>
            </button>

            <button
              type="button"
              className={`cs-drawer-tab ${activeSection === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveSection('preferences')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>User Preferences</span>
            </button>

            <button
              type="button"
              className={`cs-drawer-tab ${activeSection === 'workspace' ? 'active' : ''}`}
              onClick={() => setActiveSection('workspace')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Workspace & Data</span>
            </button>

            <button
              type="button"
              className={`cs-drawer-tab ${activeSection === 'developer' ? 'active' : ''}`}
              onClick={() => setActiveSection('developer')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Developer / Advanced</span>
            </button>
          </nav>

          {/* Scrollable Content Area */}
          <div className="cs-drawer-content">
            {/* ============================================================== */}
            {/* 1. ACCOUNT & SECURITY SECTION                                  */}
            {/* ============================================================== */}
            {activeSection === 'account' && (
              <div className="cs-section-fade">
                <div className="cs-section-header">
                  <h3>Account & Security</h3>
                  <p>Manage your login credentials, authentication layers, and active sessions.</p>
                </div>

                {/* Email Address Card */}
                <div className="cs-card-item">
                  <div className="cs-card-item-left">
                    <div className="cs-card-item-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <div className="cs-card-item-title">Email Address</div>
                      <div className="cs-card-item-desc">
                        Primary email for notifications and recovery:
                        <span className="cs-highlight-tag">{currentDisplayEmail}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cs-btn-secondary"
                    onClick={() => {
                      setNewEmailInput(currentDisplayEmail);
                      setEmailErrorMsg('');
                      setEmailSuccessMsg('');
                      setIsEditEmailOpen(true);
                    }}
                  >
                    Update Email
                  </button>
                </div>

                {/* Password Management Card */}
                <div className="cs-card-item">
                  <div className="cs-card-item-left">
                    <div className="cs-card-item-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <div className="cs-card-item-title">Password Management</div>
                      <div className="cs-card-item-desc">
                        Keep your account protected with a strong, unique password.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cs-btn-secondary"
                    onClick={() => {
                      setPwdError('');
                      setPwdSuccess('');
                      setCurrentPwd('');
                      setNewPwd('');
                      setConfirmPwd('');
                      setIsPasswordModalOpen(true);
                    }}
                  >
                    Change Password
                  </button>
                </div>

                {/* Two-Factor Authentication (2FA) Card */}
                <div className="cs-card-item">
                  <div className="cs-card-item-left">
                    <div className="cs-card-item-icon" style={{ background: is2FAEnabled ? 'rgba(16, 185, 129, 0.15)' : undefined }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={is2FAEnabled ? '#10B981' : 'currentColor'} strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <div className="cs-card-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Two-Factor Authentication (2FA)
                        {is2FAEnabled ? (
                          <span className="cs-status-badge cs-badge-active">Enabled</span>
                        ) : (
                          <span className="cs-status-badge cs-badge-inactive">Disabled</span>
                        )}
                      </div>
                      <div className="cs-card-item-desc">
                        Add a robust second layer of verification using Google Authenticator or 1Password.
                      </div>
                    </div>
                  </div>
                  <label className="cs-switch" title={is2FAEnabled ? 'Click to disable 2FA' : 'Click to enable 2FA'}>
                    <input
                      type="checkbox"
                      checked={is2FAEnabled}
                      onChange={handle2FAToggle}
                    />
                    <span className="cs-slider" />
                  </label>
                </div>

                {/* Active Sessions */}
                <div className="cs-section-sub-block">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0 }}>Active Login Sessions ({sessions.length})</h4>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        className="cs-btn-subtle-danger"
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                        onClick={() => {
                          if (window.confirm('Terminate all other active sessions?')) {
                            revokeAllOtherSessions();
                            showToast('All other sessions revoked.');
                          }
                        }}
                      >
                        Sign Out Other Devices
                      </button>
                    )}
                  </div>

                  {sessions.map((sess) => (
                    <div key={sess.id} className="cs-session-row">
                      <div className="cs-session-info">
                        <div className="cs-session-device">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {sess.device.includes('iPhone') || sess.device.includes('Mobile') ? (
                              <>
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </>
                            ) : (
                              <>
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </>
                            )}
                          </svg>
                          <span>{sess.device}</span>
                          {sess.isCurrent && <span className="cs-chip-green">Current Session</span>}
                        </div>
                        <div className="cs-session-sub">
                          IP: {sess.ip} • {sess.location} • {sess.lastActive}
                        </div>
                      </div>
                      {!sess.isCurrent && (
                        <button
                          type="button"
                          className="cs-btn-subtle-danger"
                          onClick={() => {
                            revokeSession(sess.id);
                            showToast(`Revoked ${sess.device}`);
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. USER PREFERENCES SECTION                                    */}
            {/* ============================================================== */}
            {activeSection === 'preferences' && (
              <div className="cs-section-fade">
                <div className="cs-section-header">
                  <h3>User Preferences</h3>
                  <p>Customize your theme, notification channels, and accessibility experience.</p>
                </div>

                {/* Theme Selector */}
                <div className="cs-pref-group">
                  <label className="cs-group-title">Theme Selector</label>
                  <div className="cs-theme-grid">
                    <div
                      className={`cs-theme-card ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('dark');
                        showToast('Theme set to Dark Studio');
                      }}
                    >
                      <div className="cs-theme-preview cs-preview-dark">
                        <div className="cs-prev-topbar" />
                        <div className="cs-prev-body">
                          <div className="cs-prev-sidebar" />
                          <div className="cs-prev-content" />
                        </div>
                      </div>
                      <div className="cs-theme-meta">
                        <span className="cs-theme-name">Dark Studio</span>
                        <span className="cs-theme-tag">{theme === 'dark' ? '✓ Active' : 'Default'}</span>
                      </div>
                    </div>

                    <div
                      className={`cs-theme-card ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('light');
                        showToast('Theme set to Light Paper');
                      }}
                    >
                      <div className="cs-theme-preview cs-preview-light">
                        <div className="cs-prev-topbar" />
                        <div className="cs-prev-body">
                          <div className="cs-prev-sidebar" />
                          <div className="cs-prev-content" />
                        </div>
                      </div>
                      <div className="cs-theme-meta">
                        <span className="cs-theme-name">Light Paper</span>
                        <span className="cs-theme-tag">{theme === 'light' ? '✓ Active' : 'Clean'}</span>
                      </div>
                    </div>

                    <div
                      className={`cs-theme-card ${theme === 'system' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('system');
                        showToast('Theme set to System Match');
                      }}
                    >
                      <div className="cs-theme-preview cs-preview-system">
                        <div className="cs-prev-topbar" />
                        <div className="cs-prev-body">
                          <div className="cs-prev-half-dark" />
                          <div className="cs-prev-half-light" />
                        </div>
                      </div>
                      <div className="cs-theme-meta">
                        <span className="cs-theme-name">System Match</span>
                        <span className="cs-theme-tag">{theme === 'system' ? '✓ Active' : 'Auto'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="cs-pref-group">
                  <label className="cs-group-title">Notification Settings</label>
                  <div className="cs-toggles-list">
                    <div className="cs-toggle-row">
                      <div>
                        <div className="cs-toggle-title">Room Invitations</div>
                        <div className="cs-toggle-sub">Notify me whenever someone shares a canvas room with me.</div>
                      </div>
                      <label className="cs-switch">
                        <input
                          type="checkbox"
                          checked={notifications.roomShared}
                          onChange={(e) => {
                            updateNotifications({ roomShared: e.target.checked });
                            showToast(e.target.checked ? 'Room invite alerts enabled' : 'Room invite alerts muted');
                          }}
                        />
                        <span className="cs-slider" />
                      </label>
                    </div>

                    <div className="cs-toggle-row">
                      <div>
                        <div className="cs-toggle-title">Canvas Mentions (@)</div>
                        <div className="cs-toggle-sub">Send alerts when a teammate mentions me in notes or comments.</div>
                      </div>
                      <label className="cs-switch">
                        <input
                          type="checkbox"
                          checked={notifications.mentionedInCanvas}
                          onChange={(e) => {
                            updateNotifications({ mentionedInCanvas: e.target.checked });
                            showToast(e.target.checked ? 'Canvas mention alerts enabled' : 'Canvas mention alerts muted');
                          }}
                        />
                        <span className="cs-slider" />
                      </label>
                    </div>

                    <div className="cs-toggle-row">
                      <div>
                        <div className="cs-toggle-title">Email Digests & Reports</div>
                        <div className="cs-toggle-sub">Receive activity summaries directly to your registered email.</div>
                      </div>
                      <label className="cs-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailAlerts}
                          onChange={(e) => {
                            updateNotifications({ emailAlerts: e.target.checked });
                            showToast(e.target.checked ? 'Email digests enabled' : 'Email digests muted');
                          }}
                        />
                        <span className="cs-slider" />
                      </label>
                    </div>

                    <div className="cs-toggle-row">
                      <div>
                        <div className="cs-toggle-title">Live Collaborator Audio / Join Chimes</div>
                        <div className="cs-toggle-sub">Play subtle audio pings when peers connect to your live board.</div>
                      </div>
                      <label className="cs-switch">
                        <input
                          type="checkbox"
                          checked={notifications.collaboratorJoined}
                          onChange={(e) => {
                            updateNotifications({ collaboratorJoined: e.target.checked });
                            showToast(e.target.checked ? 'Live collaborator chimes enabled' : 'Live collaborator chimes muted');
                          }}
                        />
                        <span className="cs-slider" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Accessibility & UI Scaling */}
                <div className="cs-pref-group">
                  <label className="cs-group-title">Accessibility & UI Scaling</label>
                  
                  {/* Zoom Sensitivity */}
                  <div className="cs-slider-control">
                    <div className="cs-slider-header">
                      <span>Canvas Zoom Sensitivity</span>
                      <span className="cs-slider-val">{accessibility.zoomSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={accessibility.zoomSensitivity}
                      onChange={(e) => updateAccessibility({ zoomSensitivity: Number(e.target.value) })}
                      className="cs-range-input"
                    />
                    <div className="cs-slider-labels">
                      <span>Gentle (50%)</span>
                      <span>Standard (100%)</span>
                      <span>Rapid (150%)</span>
                    </div>
                  </div>

                  {/* Font Scaling */}
                  <div className="cs-font-scale-control">
                    <label className="cs-label-sub">Interface Font Size</label>
                    <div className="cs-pill-group">
                      {(['small', 'medium', 'large'] as FontSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          className={`cs-pill-btn ${accessibility.fontSize === sz ? 'active' : ''}`}
                          onClick={() => {
                            updateAccessibility({ fontSize: sz });
                            showToast(`Font scaling set to ${sz}`);
                          }}
                        >
                          {sz.charAt(0).toUpperCase() + sz.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cs-toggle-row" style={{ marginTop: '14px' }}>
                    <div>
                      <div className="cs-toggle-title">High-Contrast Canvas Grid</div>
                      <div className="cs-toggle-sub">Increase background grid line visibility for precision drafting.</div>
                    </div>
                    <label className="cs-switch">
                      <input
                        type="checkbox"
                        checked={accessibility.highContrastGrid}
                        onChange={(e) => {
                          updateAccessibility({ highContrastGrid: e.target.checked });
                          showToast(e.target.checked ? 'High-contrast grid active' : 'Standard grid active');
                        }}
                      />
                      <span className="cs-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. WORKSPACE & DATA SECTION                                    */}
            {/* ============================================================== */}
            {activeSection === 'workspace' && (
              <div className="cs-section-fade">
                <div className="cs-section-header">
                  <h3>Workspace & Data</h3>
                  <p>Monitor real-time resource utilization, subscription tier, and export preferences.</p>
                </div>

                {/* Usage Metrics Cards */}
                <div className="cs-metrics-container">
                  <div className="cs-metric-card">
                    <div className="cs-metric-header">
                      <span className="cs-metric-title">Active Workspaces / Boards</span>
                      <span className="cs-metric-numbers">
                        {usage.activeBoards} / {usage.maxBoards} boards
                      </span>
                    </div>
                    <div className="cs-progress-track">
                      <div
                        className="cs-progress-bar"
                        style={{
                          width: `${Math.min(100, (usage.activeBoards / usage.maxBoards) * 100)}%`,
                          background: 'linear-gradient(90deg, #3654F4, #8B5CF6)',
                        }}
                      />
                    </div>
                    <div className="cs-metric-sub">
                      {usage.maxBoards - usage.activeBoards} board slots remaining on {subscriptionPlan}.
                    </div>
                  </div>

                  <div className="cs-metric-card">
                    <div className="cs-metric-header">
                      <span className="cs-metric-title">Asset & Canvas Storage</span>
                      <span className="cs-metric-numbers">
                        {usage.storageMbUsed} MB / {usage.maxStorageMb} MB
                      </span>
                    </div>
                    <div className="cs-progress-track">
                      <div
                        className="cs-progress-bar"
                        style={{
                          width: `${Math.min(100, (usage.storageMbUsed / usage.maxStorageMb) * 100)}%`,
                          background: 'linear-gradient(90deg, #10B981, #06B6D4)',
                        }}
                      />
                    </div>
                    <div className="cs-metric-sub">
                      {(usage.maxStorageMb - usage.storageMbUsed).toFixed(0)} MB cloud storage available.
                    </div>
                  </div>
                </div>

                {/* Plan / Billing Card */}
                <div className="cs-card-item cs-plan-highlight-card">
                  <div className="cs-card-item-left">
                    <div className="cs-plan-icon-wrap">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <div className="cs-card-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Current Plan: <span className="cs-plan-name">{subscriptionPlan} Studio</span>
                      </div>
                      <div className="cs-card-item-desc">
                        {subscriptionPlan === 'Free'
                          ? 'Includes up to 10 active boards, 1 GB storage, and real-time collaboration.'
                          : subscriptionPlan === 'Pro'
                          ? 'Includes up to 50 boards, 10 GB storage, priority rendering, and vector export.'
                          : 'Unlimited boards, 50 GB storage, team roles, and dedicated webhook pipelines.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cs-bento-primary-btn"
                    onClick={() => setIsPlanModalOpen(true)}
                  >
                    {subscriptionPlan === 'Team' ? 'Change Plan' : 'Upgrade Plan'}
                  </button>
                </div>

                {/* Export Preferences */}
                <div className="cs-pref-group">
                  <label className="cs-group-title">Export Preferences</label>
                  
                  <div className="cs-export-row">
                    <label className="cs-label-sub">Default Canvas Download Format</label>
                    <div className="cs-pill-group">
                      {(['PNG', 'SVG', 'PDF', 'JPEG'] as ExportFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          className={`cs-pill-btn ${exportPreferences.defaultFormat === fmt ? 'active' : ''}`}
                          onClick={() => {
                            updateExportPreferences({ defaultFormat: fmt });
                            showToast(`Default export format set to ${fmt}`);
                          }}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cs-export-row" style={{ marginTop: '16px' }}>
                    <label className="cs-label-sub">Resolution Quality / DPI</label>
                    <div className="cs-pill-group">
                      {(['1x', '2x', '3x'] as ExportDpi[]).map((dpi) => (
                        <button
                          key={dpi}
                          type="button"
                          className={`cs-pill-btn ${exportPreferences.dpi === dpi ? 'active' : ''}`}
                          onClick={() => {
                            updateExportPreferences({ dpi });
                            showToast(`Export resolution set to ${dpi}`);
                          }}
                        >
                          {dpi === '1x' ? '1x (Standard)' : dpi === '2x' ? '2x (Retina HD)' : '3x (Print 300 DPI)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cs-toggle-row" style={{ marginTop: '16px' }}>
                    <div>
                      <div className="cs-toggle-title">Transparent Canvas Background</div>
                      <div className="cs-toggle-sub">Omit workspace background colors during PNG / SVG export.</div>
                    </div>
                    <label className="cs-switch">
                      <input
                        type="checkbox"
                        checked={exportPreferences.transparentBg}
                        onChange={(e) => {
                          updateExportPreferences({ transparentBg: e.target.checked });
                          showToast(e.target.checked ? 'Transparent background enabled' : 'Transparent background disabled');
                        }}
                      />
                      <span className="cs-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 4. DEVELOPER / ADVANCED SECTION                                */}
            {/* ============================================================== */}
            {activeSection === 'developer' && (
              <div className="cs-section-fade">
                <div className="cs-section-header">
                  <h3>Developer / Advanced</h3>
                  <p>Personal access tokens, programmatic API integration, and data controls.</p>
                </div>

                {/* API Keys Card */}
                <div className="cs-api-keys-block">
                  <div className="cs-api-header-row">
                    <div>
                      <div className="cs-card-item-title">Personal Access Tokens</div>
                      <div className="cs-card-item-desc">
                        Tokens provide authenticated REST & WebSocket access to your CanvasSync boards.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cs-bento-primary-btn"
                      onClick={() => {
                        setKeyNameInput('');
                        setKeyScopeInput('read-write');
                        setGeneratedKeyResult(null);
                        setIsNewKeyModalOpen(true);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Generate New Token</span>
                    </button>
                  </div>

                  {/* Keys List */}
                  <div className="cs-keys-list">
                    {apiKeys.length === 0 ? (
                      <div className="cs-empty-keys">No active API tokens generated yet. Click above to create one.</div>
                    ) : (
                      apiKeys.map((k) => (
                        <div key={k.id} className="cs-key-row">
                          <div className="cs-key-left">
                            <div className="cs-key-name-wrap">
                              <span className="cs-key-name">{k.name}</span>
                              <span className={`cs-scope-badge cs-scope-${k.scope}`}>{k.scope}</span>
                            </div>
                            <div className="cs-key-token-display">
                              <code>{k.token.slice(0, 10)}••••••••••••••••{k.token.slice(-4)}</code>
                              <button
                                type="button"
                                className="cs-copy-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(k.token);
                                  setCopiedKeyId(k.id);
                                  showToast('Token copied to clipboard!');
                                  setTimeout(() => setCopiedKeyId(null), 2000);
                                }}
                                title="Copy full token"
                              >
                                {copiedKeyId === k.id ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="cs-key-dates">
                              Created {k.createdAt} • Last used: {k.lastUsed}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="cs-btn-subtle-danger"
                            onClick={() => {
                              if (window.confirm(`Revoke token "${k.name}"? Applications using this token will stop working immediately.`)) {
                                revokeApiKey(k.id);
                                showToast('Token revoked successfully.');
                              }
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="cs-danger-zone">
                  <div className="cs-danger-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <h4>Danger Zone</h4>
                      <p>Irreversible actions concerning your account, data, and active licenses.</p>
                    </div>
                  </div>

                  <div className="cs-danger-actions">
                    <div className="cs-danger-row">
                      <div>
                        <div className="cs-danger-title">Clear Local Cache & Personal Preferences</div>
                        <div className="cs-danger-sub">Resets local UI scaling, layout cache, and saved draft tokens.</div>
                      </div>
                      <button
                        type="button"
                        className="cs-btn-danger-outline"
                        onClick={() => setIsClearDataModalOpen(true)}
                      >
                        Clear All Personal Data
                      </button>
                    </div>

                    <div className="cs-danger-row" style={{ marginTop: '14px' }}>
                      <div>
                        <div className="cs-danger-title">Permanently Delete Account</div>
                        <div className="cs-danger-sub">
                          Permanently erase your account, all owned workspaces, layers, and synced canvas assets.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cs-btn-danger-solid"
                        onClick={() => {
                          setDeleteConfirmText('');
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <footer className="cs-drawer-footer">
            <button
              type="button"
              className="cs-drawer-logout-btn"
              onClick={() => {
                closeDrawer();
                logout();
                window.location.href = '/login';
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out of CanvasSync</span>
            </button>
            <span className="cs-drawer-version">CanvasSync Studio v2.4</span>
          </footer>
        </aside>
      </div>

      {/* ============================================================== */}
      {/* SEPARATE PORTAL MODALS (Rendered outside the drawer backdrop)   */}
      {/* ============================================================== */}

      {/* 1. Update Email Modal */}
      {isEditEmailOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsEditEmailOpen(false)}>
          <div className="cs-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Update Registered Email</h3>
            <p>Enter the new email address you want associated with this account.</p>
            {emailErrorMsg && <div className="cs-form-error">{emailErrorMsg}</div>}
            {emailSuccessMsg && <div className="cs-form-success">{emailSuccessMsg}</div>}
            <form onSubmit={handleUpdateEmailSubmit}>
              <div className="cs-field" style={{ margin: '18px 0' }}>
                <label>New Email Address</label>
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoFocus
                />
              </div>
              <div className="cs-modal-buttons">
                <button type="button" className="cs-btn-secondary" onClick={() => setIsEditEmailOpen(false)} disabled={isSubmittingEmail}>
                  Cancel
                </button>
                <button type="submit" className="cs-bento-primary-btn" disabled={isSubmittingEmail}>
                  {isSubmittingEmail ? 'Saving...' : 'Save Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="cs-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Change Account Password</h3>
            <p>Enter your current password and choose a secure new password.</p>
            {pwdError && <div className="cs-form-error">{pwdError}</div>}
            {pwdSuccess && <div className="cs-form-success">{pwdSuccess}</div>}
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="cs-field" style={{ marginBottom: '14px' }}>
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>
              <div className="cs-field" style={{ marginBottom: '14px', position: 'relative' }}>
                <label>New Password (min. 6 characters)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {showNewPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="cs-field" style={{ marginBottom: '18px' }}>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Re-type new password"
                  required
                />
              </div>
              <div className="cs-modal-buttons">
                <button type="button" className="cs-btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="cs-bento-primary-btn">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. 2FA Setup Modal */}
      {is2FAModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIs2FAModalOpen(false)}>
          <div className="cs-modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3>Setup Two-Factor Authentication</h3>
            <p>Scan the authenticator barcode or manually enter the key into your 2FA app.</p>
            
            {/* Interactive QR Pattern */}
            <div className="cs-qr-box">
              <div className="cs-mock-qr-pattern">
                <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <rect x="2" y="2" width="8" height="8" rx="1" fill="#fff" />
                  <rect x="14" y="2" width="8" height="8" rx="1" fill="#fff" />
                  <rect x="2" y="14" width="8" height="8" rx="1" fill="#fff" />
                  <rect x="14" y="14" width="4" height="4" fill="#fff" />
                  <rect x="18" y="18" width="4" height="4" fill="#fff" />
                  <rect x="4" y="4" width="4" height="4" fill="#1c2430" />
                  <rect x="16" y="4" width="4" height="4" fill="#1c2430" />
                  <rect x="4" y="16" width="4" height="4" fill="#1c2430" />
                </svg>
              </div>
              <div className="cs-secret-key-display">
                <span>Secret: <code>{twoFactorSecret}</code></span>
                <button
                  type="button"
                  className="cs-copy-mini-btn"
                  onClick={() => {
                    handleCopyText(twoFactorSecret, 'Secret Key');
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                >
                  {copiedSecret ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {twoFAError && <div className="cs-form-error">{twoFAError}</div>}

            <form onSubmit={handleVerify2FASubmit}>
              <div className="cs-field" style={{ margin: '16px 0' }}>
                <label>6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFACodeInput}
                  onChange={(e) => setTwoFACodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '20px', fontWeight: 'bold' }}
                  required
                  autoFocus
                />
              </div>
              <div className="cs-modal-buttons">
                <button type="button" className="cs-btn-secondary" onClick={() => setIs2FAModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="cs-bento-primary-btn">
                  Verify & Enable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Upgrade / Plan Comparison Modal */}
      {isPlanModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsPlanModalOpen(false)}>
          <div className="cs-modal-box cs-plan-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cs-plan-modal-head">
              <h3>Upgrade Your CanvasSync Workspace</h3>
              <p>Scale your collaborative canvases with more boards, storage, and developer webhooks.</p>
              <div className="cs-cycle-toggle">
                <button
                  type="button"
                  className={billingCycle === 'monthly' ? 'active' : ''}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={billingCycle === 'yearly' ? 'active' : ''}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly <span className="cs-save-badge">Save 20%</span>
                </button>
              </div>
            </div>

            <div className="cs-plan-cards-grid">
              {/* Free Plan */}
              <div className={`cs-pricing-card ${subscriptionPlan === 'Free' ? 'current' : ''}`}>
                <div className="cs-pricing-tier">Free Studio</div>
                <div className="cs-pricing-price">$0 <span>/ mo</span></div>
                <ul className="cs-pricing-features">
                  <li>✓ 10 Active Canvas Boards</li>
                  <li>✓ 1 GB Storage</li>
                  <li>✓ 5 Real-time Collaborators</li>
                  <li>✓ PNG & SVG Export</li>
                </ul>
                <button
                  type="button"
                  className="cs-btn-secondary"
                  disabled={subscriptionPlan === 'Free'}
                  onClick={() => {
                    setSubscriptionPlan('Free');
                    setIsPlanModalOpen(false);
                    showToast('Switched to Free Studio plan.');
                  }}
                >
                  {subscriptionPlan === 'Free' ? 'Current Plan' : 'Downgrade to Free'}
                </button>
              </div>

              {/* Pro Plan */}
              <div className={`cs-pricing-card featured ${subscriptionPlan === 'Pro' ? 'current' : ''}`}>
                <div className="cs-popular-tag">MOST POPULAR</div>
                <div className="cs-pricing-tier">Pro Creator</div>
                <div className="cs-pricing-price">
                  {billingCycle === 'monthly' ? '$12' : '$10'} <span>/ mo</span>
                </div>
                <ul className="cs-pricing-features">
                  <li>✓ 50 Active Canvas Boards</li>
                  <li>✓ 10 GB High-Speed Storage</li>
                  <li>✓ 25 Real-time Collaborators</li>
                  <li>✓ 300 DPI PDF & SVG Export</li>
                  <li>✓ Unlimited API Keys</li>
                </ul>
                <button
                  type="button"
                  className="cs-bento-primary-btn"
                  onClick={() => {
                    setSubscriptionPlan('Pro');
                    setIsPlanModalOpen(false);
                    showToast('Upgraded to Pro Creator! (50 boards, 10 GB storage)');
                  }}
                >
                  {subscriptionPlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </button>
              </div>

              {/* Team Plan */}
              <div className={`cs-pricing-card ${subscriptionPlan === 'Team' ? 'current' : ''}`}>
                <div className="cs-pricing-tier">Team Organization</div>
                <div className="cs-pricing-price">
                  {billingCycle === 'monthly' ? '$29' : '$24'} <span>/ mo</span>
                </div>
                <ul className="cs-pricing-features">
                  <li>✓ 250+ Active Canvas Boards</li>
                  <li>✓ 50 GB Cloud Storage</li>
                  <li>✓ 100 Real-time Collaborators</li>
                  <li>✓ Priority Sync & Webhooks</li>
                  <li>✓ 24/7 Dedicated Support</li>
                </ul>
                <button
                  type="button"
                  className="cs-btn-secondary"
                  onClick={() => {
                    setSubscriptionPlan('Team');
                    setIsPlanModalOpen(false);
                    showToast('Upgraded to Team Organization! (250 boards, 50 GB storage)');
                  }}
                >
                  {subscriptionPlan === 'Team' ? 'Current Plan' : 'Upgrade to Team'}
                </button>
              </div>
            </div>

            <div className="cs-modal-buttons" style={{ marginTop: '24px' }}>
              <button type="button" className="cs-btn-secondary" onClick={() => setIsPlanModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Generate API Key Modal */}
      {isNewKeyModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsNewKeyModalOpen(false)}>
          <div className="cs-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Generate Personal Access Token</h3>
            {generatedKeyResult ? (
              <div className="cs-token-created-box">
                <div className="cs-form-success">
                  Token generated! Please copy it now. You won't be able to view it again.
                </div>
                <div className="cs-token-reveal-field">
                  <code>{generatedKeyResult}</code>
                  <button
                    type="button"
                    className="cs-bento-primary-btn"
                    onClick={() => handleCopyText(generatedKeyResult, 'Access Token')}
                  >
                    Copy Token
                  </button>
                </div>
                <div className="cs-modal-buttons" style={{ marginTop: '20px' }}>
                  <button type="button" className="cs-btn-secondary" onClick={() => setIsNewKeyModalOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateKeySubmit}>
                <div className="cs-field" style={{ margin: '14px 0' }}>
                  <label>Token Name / Description</label>
                  <input
                    type="text"
                    value={keyNameInput}
                    onChange={(e) => setKeyNameInput(e.target.value)}
                    placeholder="e.g. GitHub Actions Sync or Figma Webhook"
                    required
                    autoFocus
                  />
                </div>

                <div className="cs-field" style={{ marginBottom: '18px' }}>
                  <label>Permission Scope</label>
                  <select
                    value={keyScopeInput}
                    onChange={(e) => setKeyScopeInput(e.target.value as any)}
                    className="cs-select-input"
                  >
                    <option value="read">Read Only (View canvas & layer structures)</option>
                    <option value="read-write">Read & Write (Modify shapes, paths, & rooms)</option>
                    <option value="admin">Full Admin (Manage permissions & rooms)</option>
                  </select>
                </div>

                <div className="cs-modal-buttons">
                  <button type="button" className="cs-btn-secondary" onClick={() => setIsNewKeyModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cs-bento-primary-btn">
                    Create Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. Clear Data Confirmation Modal */}
      {isClearDataModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsClearDataModalOpen(false)}>
          <div className="cs-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#EF4444' }}>Clear All Local Data & Preferences?</h3>
            <p>This will reset all your theme settings, notification choices, API tokens, and local cache to defaults.</p>
            <div className="cs-modal-buttons" style={{ marginTop: '20px' }}>
              <button type="button" className="cs-btn-secondary" onClick={() => setIsClearDataModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="cs-btn-danger-solid" onClick={handleClearData}>
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Account Safety Modal */}
      {isDeleteModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="cs-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#EF4444' }}>Delete Account Permanently</h3>
            <p style={{ color: '#EF4444' }}>
              ⚠️ WARNING: This action cannot be undone. All your canvases, layer trees, and collaborators will be deleted immediately.
            </p>
            <div className="cs-field" style={{ margin: '16px 0' }}>
              <label>
                Type <strong>{user?.username || 'DELETE'}</strong> below to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={user?.username || 'DELETE'}
                autoFocus
              />
            </div>
            <div className="cs-modal-buttons">
              <button type="button" className="cs-btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="cs-btn-danger-solid"
                disabled={deleteConfirmText !== (user?.username || 'DELETE')}
                onClick={handleDeleteAccount}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
