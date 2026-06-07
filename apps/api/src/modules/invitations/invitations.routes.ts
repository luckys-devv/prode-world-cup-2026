import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import * as invitationsController from './invitations.controller.js';

const router: Router = Router();

// Todas las rutas del módulo requieren token de acceso
router.use(authMiddleware);

router.post('/', invitationsController.inviteUserHandler);
router.get('/inbox', invitationsController.listPendingInvitationsHandler);
router.put('/:id/accept', invitationsController.acceptInvitationHandler);
router.put('/:id/reject', invitationsController.rejectInvitationHandler);

export default router;