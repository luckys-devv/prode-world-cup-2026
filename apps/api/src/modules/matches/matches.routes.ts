import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import * as matchesController from './matches.controller.js';

const router: Router = Router();

// Requerimos autenticación para ver los partidos
router.use(authMiddleware);

router.get('/', matchesController.listMatches);
router.get('/teams', matchesController.listTeams);
router.get('/:id', matchesController.getMatchDetail);

export default router;