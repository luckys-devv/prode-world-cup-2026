// ═══════════════════════════════════════════════════
// SINGLETON DE BASE DE DATOS (Prisma Client)
// ═══════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

declare global {
  // "var" (y no "let" o "const") es necesario para extender globalThis
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Guardamos la instancia en globalThis solo en desarrollo.
// En producción no es necesario porque el servidor no se recarga.
if (env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}