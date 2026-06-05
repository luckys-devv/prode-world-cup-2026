// Tipos genéricos para estandarizar las respuestas de la API.
// Todas las respuestas siguen el mismo formato,

/**
 * Respuesta estándar de la API o lo ideal.
 * 
 * Ejemplo exitoso:
 * {
 *   success: true,
 *   data: { id: 1, name: "Mi Grupo" },
 *   message: "Grupo creado exitosamente"
 * }
 * 
 * Ejemplo de error:
 * {
 *   success: false,
 *   data: null,
 *   message: "El email ya está registrado",
 *   error: "DUPLICATE_EMAIL"
 * }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  error?: string; // Código de error (solo cuando success = false)
}

/**
 * Respuesta paginada (para listas largas).
 * Extiende ApiResponse con info de paginación.
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;      // Página actual (empieza en 1)
    pageSize: number;  // Cantidad por página
    totalItems: number;
    totalPages: number;
  };
}