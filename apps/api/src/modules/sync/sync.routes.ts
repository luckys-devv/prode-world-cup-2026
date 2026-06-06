import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import * as syncController from './sync.controller.js';

const router: Router = Router();

// Todas las rutas de sincronización requieren token de acceso válido
router.use(authMiddleware);

// Rutas manuales de administración
router.post('/teams', syncController.triggerTeamsSync);
router.post('/matches', syncController.triggerMatchesSync);
router.get('/logs', syncController.getSyncLogs);

export default router;