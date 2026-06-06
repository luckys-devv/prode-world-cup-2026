import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // z.string().url() = debe ser un string con formato de URL válida
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),

  // z.string().min(10) = debe ser un string de al menos 10 caracteres
  JWT_SECRET: z.string().min(10, 'JWT_SECRET debe tener al menos 10 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET debe tener al menos 10 caracteres'),

  // z.string().min(1) = no puede estar vacío
  FOOTBALL_API_KEY: z.string().min(1, 'FOOTBALL_API_KEY es requerida'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es requerida'),

  // z.string().email() = debe tener formato de email (algo@algo.com)
  EMAIL_FROM: z.string().email('EMAIL_FROM debe ser un correo válido'),

  // z.coerce.number() = convierte el string "3001" a número 3001 automáticamente
  // .default(3001) = si no existe la variable, usa 3001
  PORT: z.coerce.number().default(3001),

  // z.enum([...]) = solo acepta uno de estos 3 valores exactos
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),
});

// safeParse() valida process.env contra nuestro schema.
// A diferencia de parse(), safeParse() NO lanza una excepción si falla.
// En cambio, devuelve { success: true, data: ... } o { success: false, error: ... }
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error en las variables de entorno de tu .env:');
  // .format() muestra los errores de forma legible (campo por campo)
  console.error(parsed.error.format());
  // process.exit(1) termina el proceso de Node.js con código de error 1
  process.exit(1);
}

export const env = parsed.data;