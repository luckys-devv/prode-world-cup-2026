// ═══════════════════════════════════════════════════
// VALIDACIONES DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════
import { z } from 'zod';

// ─── REGISTRO ──────────────────────────────────────
// Datos necesarios para crear una cuenta nueva.
export const registerSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .email('El email no tiene un formato válido')
    .toLowerCase(),

  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),

  // Nombre que se muestra en la app (ej: "Luke", "Luqui", etc.)
  displayName: z
    .string({ required_error: 'El nombre de usuario es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
});

// ─── LOGIN ─────────────────────────────────────────
// Datos necesarios para iniciar sesión.
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .email('El email no tiene un formato válido')
    .toLowerCase(),

  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

// ─── REFRESH TOKEN ─────────────────────────────────
// Para renovar el access token cuando expira.
export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refresh token es obligatorio' })
    .min(1, 'El refresh token es obligatorio'),
});

// ─── TIPOS INFERIDOS ───────────────────────────────
// z.infer<> extrae automáticamente el tipo TypeScript desde el schema de Zod.
// Así no tenemos que definir el tipo dos veces (una en Zod y otra como interface).
// Ejemplo: RegisterInput tendrá el tipo { email: string, password: string, displayName: string }
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;