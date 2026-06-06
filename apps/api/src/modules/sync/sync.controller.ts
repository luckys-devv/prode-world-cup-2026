import { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service.js';
import { db } from '../../config/database.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Endpoint para disparar manualmente la sincronización de equipos.
 */
export async function triggerTeamsSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await syncService.syncTeams();
    sendSuccess(res, null, 'Sincronización de equipos completada con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para disparar manualmente la sincronización de partidos y resultados.
 */
export async function triggerMatchesSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await syncService.syncMatches();
    sendSuccess(res, null, 'Sincronización de partidos y resultados completada con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para consultar el historial de sincronizaciones.
 */
export async function getSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await db.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // Traemos las últimas 50 entradas para no saturar
    });
    sendSuccess(res, logs, 'Logs de sincronización obtenidos con éxito.');
  } catch (error) {
    next(error);
  }
}