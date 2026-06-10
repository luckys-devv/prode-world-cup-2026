import axios from 'axios';
import { Platform } from 'react-native';
//import * as SecureStore from 'expo-secure-store';
import { storage } from '../utils/storage';

// IP del servidor backend.
// IMPORTANTE EN DESARROLLO MOBILE:
// - Usamos 10.0.2.2 en emuladores de Android (apunta a la PC host).
// - Usamos localhost en iOS Simulator y Web.
// - En un celular físico (Expo Go), deberás poner la IP local de tu PC (ej: http://192.168.1.150:3001/api).
//export const API_URL = Platform.select({
//  android: 'http://10.0.2.2:3001/api',
//  default: 'http://localhost:3001/api',
//});

export const API_URL = __DEV__
  ? Platform.select({
    android: 'http://10.0.2.2:3001/api',
    default: 'http://localhost:3001/api',
  })
  : 'https://prode-world-cup-2026-production.up.railway.app/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor de Request: Inyectar Access Token
api.interceptors.request.use(
  async (config) => {
    // Importamos dinámicamente el store de Zustand para evitar ciclos de importación
    const { useAuthStore } = await import('../stores/authStore');
    const token = useAuthStore.getState().token;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Control de refresco múltiple (evita duplicar requests de refresh si fallan varios al mismo tiempo)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de Response: Manejo automático de token expirado (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el backend da 401 y no lo intentamos refrescar todavía
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        //const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No hay refresh token guardado.');

        // Refrescar directamente con axios (para no ciclar por el interceptor)
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        // Guardar nuevos tokens en memoria y en SecureStore
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().setToken(newAccessToken);
        //await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        await storage.setItem('refreshToken', newRefreshToken);
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Reintentar petición original
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Si falla el refresh (ej: venció la sesión de 30 días), deslogueamos al usuario
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);