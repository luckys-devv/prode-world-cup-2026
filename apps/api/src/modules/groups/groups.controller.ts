import { Request, Response, NextFunction } from 'express';
import * as groupsService from './groups.service.js';
import { createGroupSchema } from './groups.validation.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../utils/apiResponse.js';
import { db } from '../../config/database.js';

/**
 * Crea un grupo validando la configuración de puntaje.
 */
export async function createGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBadRequest(res, 'Datos de creación de grupo inválidos', parsed.error.format());
    }

    const userId = req.user!.userId;
    const group = await groupsService.createGroup(userId, parsed.data);
    sendCreated(res, group, 'Grupo creado con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Lista los grupos del usuario actual.
 */
export async function listGroupsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groups = await groupsService.getUserGroups(userId);

    // Consulta de agregación ultra rápida en la BD
    const pointsAggregation = await db.matchPrediction.aggregate({
      _sum: {
        winnerPoints: true,
        exactScorePoints: true,
      },
      where: {
        userId,
      },
    });
    const totalPoints = (pointsAggregation._sum.winnerPoints ?? 0) + (pointsAggregation._sum.exactScorePoints ?? 0);

    // Devolvemos los grupos y el total de puntos en la raíz de la respuesta
    res.status(200).json({
      success: true,
      data: groups,
      totalPoints,
      message: 'Grupos obtenidos con éxito.',
    });
  } catch (error) {
    next(error);
  }
}

//export async function listGroupsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
//  try {
//    const userId = req.user!.userId;
//    const groups = await groupsService.getUserGroups(userId);
//    sendSuccess(res, groups, 'Grupos obtenidos con éxito.');
//  } catch (error) {
//    next(error);
//  }
//}

/**
 * Obtiene el detalle de un grupo (miembros y configuración).
 */
export async function getGroupDetailHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.id as string, 10);
    if (isNaN(groupId)) {
      return sendBadRequest(res, 'El ID de grupo provisto no es válido.');
    }

    const userId = req.user!.userId;
    const group = await groupsService.getGroupDetail(groupId, userId);
    sendSuccess(res, group, 'Detalle del grupo obtenido con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Permite al usuario unirse a un grupo mediante su código de invitación.
 */
export async function joinGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inviteCode = req.params.code;
    if (!inviteCode) {
      return sendBadRequest(res, 'El código de invitación es requerido.');
    }

    const userId = req.user!.userId;
    const membership = await groupsService.joinGroupByCode(userId, inviteCode as string);
    sendSuccess(res, membership, 'Te has unido al grupo exitosamente.');
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene la tabla de posiciones del grupo.
 */
export async function getGroupLeaderboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.id as string, 10);
    if (isNaN(groupId)) {
      return sendBadRequest(res, 'El ID de grupo provisto no es válido.');
    }

    const userId = req.user!.userId;
    const leaderboard = await groupsService.getGroupLeaderboard(groupId, userId);
    sendSuccess(res, leaderboard, 'Tabla de posiciones obtenida con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Elimina un grupo (solo si el creador está solo en la sala).
 * DELETE /api/groups/:id
 */
export async function deleteGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.id as string, 10);
    if (isNaN(groupId)) {
      return sendBadRequest(res, 'El ID de grupo provisto no es válido.');
    }

    const userId = req.user!.userId;
    await groupsService.deleteGroup(groupId, userId);
    sendSuccess(res, null, 'Grupo eliminado con éxito.');
  } catch (error) {
    next(error);
  }
}