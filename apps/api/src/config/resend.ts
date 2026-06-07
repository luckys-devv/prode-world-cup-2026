import { Resend } from 'resend';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Inicializamos el cliente si la API key es válida y no es el placeholder por defecto
export const resend = env.RESEND_API_KEY && env.RESEND_API_KEY !== 're_xxxxxxxxxxxx'
  ? new Resend(env.RESEND_API_KEY)
  : null;

if (!resend) {
  logger.warn('📧 Resend no configurado o usa API Key por defecto. Los correos se imprimirán en consola para pruebas.');
}