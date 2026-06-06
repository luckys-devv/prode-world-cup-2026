import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,       // El error que se lanzó
  req: Request,        // La petición HTTP que causó el error
  res: Response,       // El objeto de respuesta para enviar al cliente
  _next: NextFunction  // Función para pasar al siguiente middleware (no la usamos acá)
): void => {
  // Si el error tiene un statusCode personalizado, lo usamos.
  // Si no, asumimos 500 (error interno del servidor).
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  console.error(`[Error] ${statusCode} - ${message}`);

  // En desarrollo, también mostramos el "stack trace" completo
  // (la cadena de archivos y líneas donde ocurrió el error).
  // En producción NO lo mostramos porque puede revelar rutas internas del servidor.
  if (err.stack && env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      // Solo en desarrollo incluimos el stack trace en la respuesta JSON.
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};