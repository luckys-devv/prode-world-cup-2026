import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import * as predictionsController from './predictions.controller.js';

const router: Router = Router();

// Hay que estar logueado papucho, sino a mimir
router.use(authMiddleware);

router.post('/', predictionsController.createOrUpdatePredictionHandler);
router.get('/group/:groupId', predictionsController.getUserPredictionsHandler);
router.get('/group/:groupId/match/:matchId', predictionsController.getMatchPredictionsHandler);

export default router;