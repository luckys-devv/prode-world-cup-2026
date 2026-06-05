// Tipos para todo lo relacionado con autenticación.
// Estos tipos se usan en:
//   - Backend: para validar los datos que llegan en los requests
//   - Mobile/Web: para saber qué mandar y qué esperar de respuesta

/** Datos necesarios para registrar un usuario nuevo */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string; // Nombre que se muestra en la app (ej: "Luke")
}

/** Datos para iniciar sesión */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Datos para renovar el access token cuando expira */
export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─── RESPONSES ───

/** Respuesta después de login o register exitoso */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

/** Datos públicos del usuario (cuidado bobi) */
export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  createdAt: string; // ISO 8601 date string (ej: "2026-06-05T10:00:00Z")
}