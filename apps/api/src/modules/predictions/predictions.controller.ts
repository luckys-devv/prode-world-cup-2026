import { Request, Response, NextFunction } from 'express';
import * as predictionsService from './predictions.service.js';
import { createPredictionSchema } from './predictions.validation.js';
import { sendSuccess, sendBadRequest } from '../../utils/apiResponse.js';

/**
 * Crea o actualiza una predicción para un partido.
 */
export async function createOrUpdatePredictionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPredictionSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBadRequest(res, 'Datos de predicción inválidos', parsed.error.format());
    }

    const userId = req.user!.userId;
    const prediction = await predictionsService.createOrUpdatePrediction(userId, parsed.data);
    sendSuccess(res, prediction, 'Predicción guardada con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene las predicciones del usuario actual en un grupo.
 */
export async function getUserPredictionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId as string, 10);
    if (isNaN(groupId)) {
      return sendBadRequest(res, 'El ID de grupo no es válido.');
    }

    const userId = req.user!.userId;
    const predictions = await predictionsService.getUserPredictionsInGroup(userId, groupId);
    sendSuccess(res, predictions, 'Predicciones obtenidas con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene los pronósticos de todos los miembros del grupo para un partido (con privacidad aplicada).
 */
export async function getMatchPredictionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId as string, 10);
    const matchId = parseInt(req.params.matchId as string, 10);

    if (isNaN(groupId) || isNaN(matchId)) {
      return sendBadRequest(res, 'Los IDs de grupo o partido no son válidos.');
    }

    const userId = req.user!.userId;
    const predictions = await predictionsService.getMatchPredictionsInGroup(groupId, matchId, userId);
    sendSuccess(res, predictions, 'Predicciones del partido obtenidas con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Crea o actualiza la predicción del campeón para el usuario.
 * POST /api/predictions/champion
 */
export async function createOrUpdateChampionPredictionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { groupId, teamId } = req.body;

    if (!groupId || !teamId) {
      return sendBadRequest(res, 'Los campos groupId y teamId son obligatorios.');
    }

    const userId = req.user!.userId;
    const prediction = await predictionsService.createOrUpdateChampionPrediction(userId, Number(groupId), Number(teamId));
    sendSuccess(res, prediction, 'Predicción de campeón guardada con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene la predicción del campeón de un usuario en un grupo.
 * GET /api/predictions/group/:groupId/champion
 */
export async function getChampionPredictionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId as string, 10);
    if (isNaN(groupId)) {
      return sendBadRequest(res, 'El ID de grupo no es válido.');
    }

    const userId = req.user!.userId;
    const prediction = await predictionsService.getChampionPrediction(userId, groupId);
    sendSuccess(res, prediction, 'Predicción de campeón obtenida con éxito.');
  } catch (error) {
    next(error);
  }
}