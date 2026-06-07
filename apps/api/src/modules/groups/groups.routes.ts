import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import * as groupsController from './groups.controller.js';

const router: Router = Router();

// Todas las rutas de grupos requieren estar autenticado
router.use(authMiddleware);

router.post('/', groupsController.createGroupHandler);
router.get('/', groupsController.listGroupsHandler);
router.get('/:id', groupsController.getGroupDetailHandler);
router.post('/join/:code', groupsController.joinGroupHandler);

export default router;