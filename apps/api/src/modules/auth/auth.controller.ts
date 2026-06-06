// ═══════════════════════════════════════════════════
// CONTROLLER DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════
// Intermediario entre las rutas HTTP y la lógica de negocio (service).
// Valida datos → llama al service → responde al cliente.

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../utils/apiResponse.js';

// POST /api/auth/register
export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validar datos del body con Zod
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      // Si falla, respondemos con 400 y los errores de validación
      return sendBadRequest(res, 'Datos de registro inválidos', parsed.error.format());
    }

    const result = await authService.register(parsed.data);
    return sendCreated(res, result, 'Cuenta creada exitosamente');
  } catch (error) {
    // Cualquier error no controlado se pasa al errorHandler global
    next(error);
  }
}

// POST /api/auth/login
export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBadRequest(res, 'Datos de login inválidos', parsed.error.format());
    }

    const result = await authService.login(parsed.data);
    return sendSuccess(res, result, 'Sesión iniciada');
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/refresh
export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBadRequest(res, 'Refresh token inválido', parsed.error.format());
    }

    const result = await authService.refresh(parsed.data.refreshToken);
    return sendSuccess(res, result, 'Token renovado');
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout
export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // El refresh token puede venir en el body
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    return sendSuccess(res, null, 'Sesión cerrada');
  } catch (error) {
    next(error);
  }
}