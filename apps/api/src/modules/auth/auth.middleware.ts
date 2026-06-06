// ═══════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ═══════════════════════════════════════════════════
// Verifica el access token en cada petición protegida.
// Si el token es válido, agrega req.user con { userId, email }.
// Si no, responde 401 (No autorizado).

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { sendUnauthorized } from '../../utils/apiResponse.js';

// Definimos la estructura del payload que va dentro del JWT
interface JwtPayload {
  userId: number;
  email: string;
}

// Extendemos el tipo Request de Express para agregar la propiedad "user".
// Sin esto, TypeScript se queja cuando hacés req.user en otros archivos.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // El frontend manda el token en el header "Authorization" con formato:
  // "Bearer eyJhbGciOiJIUzI1NiJ9..." ("Bearer" + espacio + el token)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Token de acceso no proporcionado');
  }

  // Extraer solo el token (sin la palabra "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify() decodifica el token y verifica que:
    // 1. Fue firmado con nuestro JWT_SECRET (no fue falsificado)
    // 2. No expiró (los 30 minutos no pasaron)
    // Si falla, lanza un error que atrapamos en el catch.
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Agregamos los datos del usuario al objeto req.
    // Ahora cualquier ruta posterior puede hacer req.user.userId
    req.user = decoded;

    // next() = "todo OK, seguí con la siguiente función/ruta"
    next();
  } catch (error) {
    return sendUnauthorized(res, 'Token de acceso inválido o expirado');
  }
}