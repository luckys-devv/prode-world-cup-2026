import { create } from 'zustand';
import axios from 'axios';
import { storage } from '../utils/storage';
// Importamos el perfil de usuario compartido del monorepo
import { UserProfile } from '@prode/shared';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (accessToken: string) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (accessToken, refreshToken, user) => {
    await storage.setItem('refreshToken', refreshToken);
    await storage.setItem('user', JSON.stringify(user));

    set({
      token: accessToken,
      user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await storage.deleteItem('refreshToken');
    await storage.deleteItem('user');

    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  setToken: (accessToken) => {
    set({ token: accessToken });
  },

  initialize: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      const storedUser = await storage.getItem('user');

      if (refreshToken && storedUser) {
        const user = JSON.parse(storedUser) as UserProfile;
        const { API_URL } = await import('../services/api');

        // Renovamos el access token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        await storage.setItem('refreshToken', newRefreshToken);

        set({
          token: newAccessToken,
          user,
          isAuthenticated: true,
          isInitializing: false,
        });
        return;
      }
    } catch (error) {
      console.warn('Sesión previa expirada o inválida al iniciar la app.');
      await storage.deleteItem('refreshToken');
      await storage.deleteItem('user');
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  },
}));