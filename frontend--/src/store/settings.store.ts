import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { authApi } from '../api/auth.api';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ExportFormat = 'PNG' | 'SVG' | 'PDF' | 'JPEG';
export type ExportDpi = '1x' | '2x' | '3x';
export type FontSize = 'small' | 'medium' | 'large';
export type ActiveSection = 'account' | 'preferences' | 'workspace' | 'developer';

export interface ApiKeyItem {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsed: string;
  scope: 'read' | 'read-write' | 'admin';
}

export interface SessionItem {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  inAppAlerts: boolean;
  roomShared: boolean;
  mentionedInCanvas: boolean;
  collaboratorJoined: boolean;
  productUpdates: boolean;
}

export interface AccessibilitySettings {
  zoomSensitivity: number; // 50 to 150
  fontSize: FontSize;
  reduceMotion: boolean;
  highContrastGrid: boolean;
}

export interface ExportPreferences {
  defaultFormat: ExportFormat;
  dpi: ExportDpi;
  transparentBg: boolean;
}

export interface WorkspaceUsage {
  activeBoards: number;
  maxBoards: number;
  storageMbUsed: number;
  maxStorageMb: number;
  collaboratorsUsed: number;
  maxCollaborators: number;
}

interface SettingsState {
  // Drawer UI state
  isDrawerOpen: boolean;
  drawerWidthPercent: number; // 55 to 75
  activeSection: ActiveSection;
  
  // Account & Security
  customEmail: string | null;
  is2FAEnabled: boolean;
  twoFactorSecret: string;
  sessions: SessionItem[];
  
  // User Preferences
  theme: ThemeMode;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  
  // Workspace & Data
  subscriptionPlan: 'Free' | 'Pro' | 'Team';
  usage: WorkspaceUsage;
  exportPreferences: ExportPreferences;
  
  // Developer / Advanced
  apiKeys: ApiKeyItem[];
  
  // Actions
  openDrawer: (section?: ActiveSection) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setDrawerWidthPercent: (width: number) => void;
  setActiveSection: (section: ActiveSection) => void;
  
  updateEmail: (email: string) => Promise<void>;
  set2FAEnabled: (enabled: boolean) => void;
  regenerate2FASecret: () => string;
  revokeSession: (id: string) => void;
  revokeAllOtherSessions: () => void;
  
  setTheme: (theme: ThemeMode) => void;
  updateNotifications: (partial: Partial<NotificationSettings>) => void;
  updateAccessibility: (partial: Partial<AccessibilitySettings>) => void;
  
  setSubscriptionPlan: (plan: 'Free' | 'Pro' | 'Team') => void;
  updateExportPreferences: (partial: Partial<ExportPreferences>) => void;
  
  generateApiKey: (name: string, scope: 'read' | 'read-write' | 'admin') => ApiKeyItem;
  revokeApiKey: (id: string) => void;
  
  clearAllPersonalData: () => void;
}

const STORAGE_KEY = 'canvassync_user_settings_v2';

const getDefaultState = () => {
  return {
    isDrawerOpen: false,
    drawerWidthPercent: 65,
    activeSection: 'account' as ActiveSection,
    
    customEmail: null,
    is2FAEnabled: false,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    sessions: [
      {
        id: 'sess_1',
        device: 'Chrome on Windows',
        ip: '192.168.1.104',
        location: 'Bengaluru, IN',
        lastActive: 'Active Now',
        isCurrent: true,
      },
      {
        id: 'sess_2',
        device: 'Safari on iPhone 15 Pro',
        ip: '104.28.21.90',
        location: 'Mumbai, IN',
        lastActive: '2 days ago',
        isCurrent: false,
      },
      {
        id: 'sess_3',
        device: 'Firefox on MacBook Pro M3',
        ip: '49.207.195.12',
        location: 'Delhi, IN',
        lastActive: '5 days ago',
        isCurrent: false,
      },
    ],
    
    theme: 'dark' as ThemeMode,
    notifications: {
      emailAlerts: true,
      inAppAlerts: true,
      roomShared: true,
      mentionedInCanvas: true,
      collaboratorJoined: true,
      productUpdates: false,
    },
    accessibility: {
      zoomSensitivity: 100,
      fontSize: 'medium' as FontSize,
      reduceMotion: false,
      highContrastGrid: false,
    },
    
    subscriptionPlan: 'Free' as 'Free' | 'Pro' | 'Team',
    usage: {
      activeBoards: 4,
      maxBoards: 10,
      storageMbUsed: 148,
      maxStorageMb: 1024,
      collaboratorsUsed: 3,
      maxCollaborators: 5,
    },
    exportPreferences: {
      defaultFormat: 'PNG' as ExportFormat,
      dpi: '2x' as ExportDpi,
      transparentBg: true,
    },
    
    apiKeys: [
      {
        id: 'key_1',
        name: 'Default CI/CD Integration',
        token: 'cs_live_9f8a7e3d1c4b5a60e8d7c2b1',
        createdAt: '2026-08-15',
        lastUsed: '2 hours ago',
        scope: 'read-write' as const,
      },
      {
        id: 'key_2',
        name: 'Figma to CanvasSync Sync Script',
        token: 'cs_live_4d3c2b1a0f9e8d7c6b5a4012',
        createdAt: '2026-09-01',
        lastUsed: 'Yesterday',
        scope: 'read' as const,
      }
    ],
  };
};

// Load saved settings from localStorage
const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
      isDrawerOpen: false, // Always start closed
    };
  } catch {
    return getDefaultState();
  }
};

const saveSettings = (state: Partial<SettingsState>) => {
  try {
    const toSave = {
      customEmail: state.customEmail,
      is2FAEnabled: state.is2FAEnabled,
      twoFactorSecret: state.twoFactorSecret,
      sessions: state.sessions,
      theme: state.theme,
      notifications: state.notifications,
      accessibility: state.accessibility,
      subscriptionPlan: state.subscriptionPlan,
      usage: state.usage,
      exportPreferences: state.exportPreferences,
      apiKeys: state.apiKeys,
      drawerWidthPercent: state.drawerWidthPercent,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
};

// Apply theme to DOM document
export const applyThemeToDocument = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
};

// Apply font scaling
export const applyFontScaleToDocument = (fontSize: FontSize) => {
  const root = document.documentElement;
  if (fontSize === 'small') {
    root.style.setProperty('--app-font-scale', '0.9');
  } else if (fontSize === 'large') {
    root.style.setProperty('--app-font-scale', '1.1');
  } else {
    root.style.setProperty('--app-font-scale', '1.0');
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSavedSettings();
  
  // Apply initial theme & font scale
  if (typeof window !== 'undefined') {
    applyThemeToDocument(initial.theme);
    applyFontScaleToDocument(initial.accessibility.fontSize);
  }

  return {
    ...initial,
    
    openDrawer: (section) => {
      set({ 
        isDrawerOpen: true, 
        ...(section ? { activeSection: section } : {}) 
      });
    },
    
    closeDrawer: () => {
      set({ isDrawerOpen: false });
    },
    
    toggleDrawer: () => {
      set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
    },
    
    setDrawerWidthPercent: (width) => {
      const clamped = Math.max(50, Math.min(75, width));
      set({ drawerWidthPercent: clamped });
      saveSettings(get());
    },
    
    setActiveSection: (section) => {
      set({ activeSection: section });
    },
    
    updateEmail: async (email) => {
      try {
        await authApi.updateEmail({ email });
        set({ customEmail: email });
        const authState = useAuthStore.getState();
        if (authState.user) {
          useAuthStore.setState({
            user: {
              ...authState.user,
              email: email,
            },
          });
        }
        saveSettings(get());
      } catch (err) {
        console.error('Failed to update email in DB:', err);
        throw err;
      }
    },
    
    set2FAEnabled: (enabled) => {
      set({ is2FAEnabled: enabled });
      saveSettings(get());
    },
    
    regenerate2FASecret: () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let secret = '';
      for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      set({ twoFactorSecret: secret });
      saveSettings(get());
      return secret;
    },

    revokeSession: (id) => {
      set((state) => {
        const nextSessions = state.sessions.filter((s) => s.id !== id);
        const updated = { ...state, sessions: nextSessions };
        saveSettings(updated);
        return { sessions: nextSessions };
      });
    },

    revokeAllOtherSessions: () => {
      set((state) => {
        const nextSessions = state.sessions.filter((s) => s.isCurrent);
        const updated = { ...state, sessions: nextSessions };
        saveSettings(updated);
        return { sessions: nextSessions };
      });
    },
    
    setTheme: (theme) => {
      set({ theme });
      applyThemeToDocument(theme);
      saveSettings(get());
    },
    
    updateNotifications: (partial) => {
      set((state) => {
        const next = { ...state.notifications, ...partial };
        const updated = { ...state, notifications: next };
        saveSettings(updated);
        return { notifications: next };
      });
    },
    
    updateAccessibility: (partial) => {
      set((state) => {
        const next = { ...state.accessibility, ...partial };
        if (partial.fontSize) {
          applyFontScaleToDocument(partial.fontSize);
        }
        const updated = { ...state, accessibility: next };
        saveSettings(updated);
        return { accessibility: next };
      });
    },
    
    setSubscriptionPlan: (subscriptionPlan) => {
      set((state) => {
        const maxBoards = subscriptionPlan === 'Free' ? 10 : subscriptionPlan === 'Pro' ? 50 : 250;
        const maxStorageMb = subscriptionPlan === 'Free' ? 1024 : subscriptionPlan === 'Pro' ? 10240 : 51200;
        const maxCollaborators = subscriptionPlan === 'Free' ? 5 : subscriptionPlan === 'Pro' ? 25 : 100;
        
        const usage = {
          ...state.usage,
          maxBoards,
          maxStorageMb,
          maxCollaborators,
        };
        const updated = { ...state, subscriptionPlan, usage };
        saveSettings(updated);
        return { subscriptionPlan, usage };
      });
    },
    
    updateExportPreferences: (partial) => {
      set((state) => {
        const next = { ...state.exportPreferences, ...partial };
        const updated = { ...state, exportPreferences: next };
        saveSettings(updated);
        return { exportPreferences: next };
      });
    },
    
    generateApiKey: (name, scope) => {
      const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newKey: ApiKeyItem = {
        id: 'key_' + Date.now(),
        name: name.trim() || 'API Token',
        token: `cs_live_${randomHex}`,
        createdAt: new Date().toISOString().split('T')[0],
        lastUsed: 'Never',
        scope,
      };
      
      set((state) => {
        const nextKeys = [newKey, ...state.apiKeys];
        const updated = { ...state, apiKeys: nextKeys };
        saveSettings(updated);
        return { apiKeys: nextKeys };
      });
      
      return newKey;
    },
    
    revokeApiKey: (id) => {
      set((state) => {
        const nextKeys = state.apiKeys.filter((k) => k.id !== id);
        const updated = { ...state, apiKeys: nextKeys };
        saveSettings(updated);
        return { apiKeys: nextKeys };
      });
    },
    
    clearAllPersonalData: () => {
      localStorage.removeItem(STORAGE_KEY);
      const reset = getDefaultState();
      set(reset);
    },
  };
});
