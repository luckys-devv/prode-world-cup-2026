import cron from 'node-cron';
import { syncMatches } from './sync.service.js';
import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * Inicializa las tareas programadas (cron jobs) de sincronización de partidos.
 */
export function initCronJobs(): void {
  logger.info('⏰ Inicializando tareas programadas (cron)...');

  // 1. Cada 15 minutos: Sincroniza resultados solo si hay partidos hoy que no finalizaron.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Buscamos partidos de hoy que sigan activos o programados
      const activeMatchesToday = await db.match.findMany({
        where: {
          matchDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
          status: {
            notIn: ['FINISHED', 'CANCELLED', 'AWARDED'],
          },
        },
      });

      if (activeMatchesToday.length > 0) {
        logger.info(`[CRON] Sincronizando resultados: hay ${activeMatchesToday.length} partidos activos hoy.`);
        await syncMatches();
      } else {
        logger.debug('[CRON] Omitiendo sync rápido: no hay partidos activos hoy.');
      }
    } catch (error: any) {
      logger.error('[CRON ERROR] Falló la tarea de 15 minutos:', error.message);
    }
  });

  // 2. Cada 6 horas: Sincronización completa de fixture.
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('[CRON] Iniciando sincronización completa del fixture (intervalo de 6 horas)...');
      await syncMatches();
    } catch (error: any) {
      logger.error('[CRON ERROR] Falló la tarea de 6 horas:', error.message);
    }
  });
}