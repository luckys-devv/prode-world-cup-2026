import { create } from 'zustand';
//import * as SecureStore from 'expo-secure-store';
import { storage } from '../utils/storage';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  displayName: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
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
    // Persistimos los datos de forma segura en el dispositivo
    //await SecureStore.setItemAsync('refreshToken', refreshToken);
    //await SecureStore.setItemAsync('user', JSON.stringify(user));
    await storage.setItem('refreshToken', refreshToken);
    await storage.setItem('user', JSON.stringify(user));

    set({
      token: accessToken,
      user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    // Limpiamos los datos del almacenamiento del celular
    //await SecureStore.deleteItemAsync('refreshToken');
    //await SecureStore.deleteItemAsync('user');
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
      //const refreshToken = await SecureStore.getItemAsync('refreshToken');
      //const storedUser = await SecureStore.getItemAsync('user');
      const refreshToken = await storage.getItem('refreshToken');
      const storedUser = await storage.getItem('user');

      if (refreshToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        const { API_URL } = await import('../services/api');

        // Intentamos refrescar el access token de arranque
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        //await SecureStore.setItemAsync('refreshToken', newRefreshToken);
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
      // Limpiamos datos residuales si falló la renovación
      //await SecureStore.deleteItemAsync('refreshToken');
      //await SecureStore.deleteItemAsync('user');
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