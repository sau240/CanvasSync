import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { LoginRequest, RegisterRequest, User } from '../types/auth.types';
import { tokenStorage } from '../utils/token_storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;

  // Changing Password
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: tokenStorage.getAuthToken(),
  isAuthenticated: !!tokenStorage.getAuthToken(),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      tokenStorage.setAuthToken(response.access_token);
      if (response.refresh_token) {
        tokenStorage.setRefreshToken(response.refresh_token);
      }

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to login',
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      tokenStorage.setAuthToken(response.access_token);

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Registration failed',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: () => {
    tokenStorage.clearTokens();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    set ({isLoading: true, error: null});

    try {
      await authApi.changePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      set ({isLoading: false});
    } catch (err: any) {
      set ({
        error:
        err.response?.data?.detail ||
        'Failed to change Password ....',
        isLoading: false,
      });
      throw err;
    }
  },

  initAuth: async () => {
    const token = tokenStorage.getAuthToken();
    if (!token) return;

    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      tokenStorage.clearTokens();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user }),
}));