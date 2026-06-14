// Formato estandar de repuestas de la api
//  Exito:  { success: true,  data: { ... }, message: "..." }
//  Error:  { success: false, error: { message: "...", details?: ... } }
import { Response } from 'express';

// ─── RESPUESTAS EXITOSAS ───────────────────────────

// "data" es lo que le mandamos al frontend (un usuario, una lista de partidos, etc.)
// "message" es un texto opcional en español para mostrar en la app (ej: "Sesión iniciada").
// El <T> es un "genérico" de TypeScript: significa que "data" puede ser de cualquier tipo.
// Ejemplo: sendSuccess<User>(res, usuario, 'Bienvenido') → data será de tipo User.
export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string) {
  sendSuccess(res, data, message, 200);
}

// ─── RESPUESTAS DE ERROR ───────────────────────────

// Error genérico. Recibe el código HTTP y el mensaje.
export function sendError(res: Response, statusCode: number, message: string, details?: unknown) {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

// ─── ERRORES COMUNES (atajos) ──────────────────────
export function sendBadRequest(res: Response, message: string = 'Datos inválidos', details?: unknown) {
  sendError(res, 400, message, details);
}

// 401 Unauthorized: el usuario no está autenticado (no mandó token o el token expiró).
export function sendUnauthorized(res: Response, message: string = 'No autorizado') {
  sendError(res, 401, message);
}

// 403 Forbidden: el usuario está autenticado pero no tiene permiso para esta acción.
// Ej: un miembro intenta eliminar un grupo (solo el admin puede).
export function sendForbidden(res: Response, message: string = 'No tenés permiso para esta acción') {
  sendError(res, 403, message);
}

// Ej: buscar un grupo con un ID que no existe en la BD.
export function sendNotFound(res: Response, message: string = 'Recurso no encontrado') {
  sendError(res, 404, message);
}

// Ej: intentar registrarse con un email que ya existe.
export function sendConflict(res: Response, message: string = 'El recurso ya existe') {
  sendError(res, 409, message);
}