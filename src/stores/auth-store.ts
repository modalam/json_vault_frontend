import { create } from 'zustand';
import {
  clearSession,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/session';
import * as api from '@/lib/api-client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  createdAt?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await api.login(email, password);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      set({ user: result.user });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true });
    try {
      const result = await api.register(email, password, displayName);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      set({ user: result.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch {
      // Clear local session even if API call fails.
    } finally {
      clearSession();
      set({ user: null });
    }
  },

  initialize: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });
    try {
      const result = await api.refreshSession(refreshToken);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      const user = await api.getMe();
      set({ user });
    } catch {
      clearSession();
      set({ user: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },
}));
