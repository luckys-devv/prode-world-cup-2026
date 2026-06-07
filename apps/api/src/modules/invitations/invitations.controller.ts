import { Request, Response, NextFunction } from 'express';
import * as invitationsService from './invitations.service.js';
import { inviteByEmailSchema } from './invitations.validation.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../utils/apiResponse.js';

/**
 * Endpoint para invitar a un usuario a un grupo por correo.
 */
export async function inviteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = inviteByEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBadRequest(res, 'Datos de invitación inválidos', parsed.error.format());
    }

    const senderId = req.user!.userId;
    const invitation = await invitationsService.inviteUser(senderId, parsed.data);
    sendCreated(res, invitation, 'Invitación enviada con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para listar las invitaciones pendientes del usuario actual (inbox).
 */
export async function listPendingInvitationsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const invitations = await invitationsService.getPendingInvitations(userId, userEmail);
    sendSuccess(res, invitations, 'Invitaciones pendientes obtenidas con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para aceptar una invitación.
 */
export async function acceptInvitationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invitationId = parseInt(req.params.id as string, 10);
    if (isNaN(invitationId)) {
      return sendBadRequest(res, 'El ID de la invitación provisto no es válido.');
    }

    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const membership = await invitationsService.acceptInvitation(invitationId, userId, userEmail);
    sendSuccess(res, membership, 'Invitación aceptada con éxito. Te has unido al grupo.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para rechazar una invitación.
 */
export async function rejectInvitationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invitationId = parseInt(req.params.id as string, 10);
    if (isNaN(invitationId)) {
      return sendBadRequest(res, 'El ID de la invitación provisto no es válido.');
    }

    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    await invitationsService.rejectInvitation(invitationId, userId, userEmail);
    sendSuccess(res, null, 'Invitación rechazada con éxito.');
  } catch (error) {
    next(error);
  }
}