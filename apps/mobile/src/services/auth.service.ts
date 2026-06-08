import { api } from './api';
import { useAuthStore } from '../stores/authStore';
//import * as SecureStore from 'expo-secure-store';
import { storage } from '../utils/storage';

/**
 * Llama al backend para iniciar sesión e impacta el store.
 */
export async function login(email: string, password: string) {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data.data;

    // Guardamos sesión en Zustand y SecureStore
    await useAuthStore.getState().login(accessToken, refreshToken, user);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.error || new Error('Error al iniciar sesión');
  }
}

/**
 * Llama al backend para registrar un usuario nuevo e impacta el store.
 */
export async function register(email: string, password: string, displayName: string) {
  try {
    const response = await api.post('/auth/register', { email, password, displayName });
    const { accessToken, refreshToken, user } = response.data.data;

    // Guardamos sesión
    await useAuthStore.getState().login(accessToken, refreshToken, user);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.error || new Error('Error al registrarse');
  }
}

/**
 * Cierra la sesión, avisando al backend para revocar el token e invalidando la sesión local.
 */
export async function logout() {
  try {
    //const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const refreshToken = await storage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Error al avisar de logout al backend:', error);
  } finally {
    // Limpiamos siempre a nivel local para no trabar al usuario
    await useAuthStore.getState().logout();
  }
}