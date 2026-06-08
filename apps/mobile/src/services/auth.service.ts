import { api } from './api';
import { useAuthStore } from '../stores/authStore';
import { storage } from '../utils/storage';
// Importamos las interfaces unificadas de peticiones y respuestas
import { LoginRequest, RegisterRequest, AuthResponse } from '@prode/shared';

/**
 * Inicia sesión usando la interfaz LoginRequest y devuelve la respuesta tipada.
 */
export async function login(input: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/login', input);
    const authData = response.data.data as AuthResponse;

    // Guardamos en el store global con tipos limpios
    await useAuthStore.getState().login(authData.accessToken, authData.refreshToken, authData.user);
    return authData;
  } catch (error: any) {
    throw error.response?.data?.error || new Error('Error al iniciar sesión');
  }
}

/**
 * Registra un usuario usando la interfaz RegisterRequest y devuelve la respuesta tipada.
 */
export async function register(input: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/register', input);
    const authData = response.data.data as AuthResponse;

    await useAuthStore.getState().login(authData.accessToken, authData.refreshToken, authData.user);
    return authData;
  } catch (error: any) {
    throw error.response?.data?.error || new Error('Error al registrarse');
  }
}

/**
 * Cierra la sesión revocando el token en el backend y limpiando el almacenamiento local.
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = await storage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Error al avisar de logout al backend:', error);
  } finally {
    await useAuthStore.getState().logout();
  }
}