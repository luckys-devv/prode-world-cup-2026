import { Request, Response, NextFunction } from 'express';
import * as groupsService from './groups.service.js';
import { createGroupSchema } from './groups.validation.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../utils/apiResponse.js';

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
    sendSuccess(res, groups, 'Grupos obtenidos con éxito.');
  } catch (error) {
    next(error);
  }
}

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