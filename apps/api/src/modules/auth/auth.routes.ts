// ═══════════════════════════════════════════════════
// RUTAS DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════
// Define los endpoints de /api/auth y los conecta con el controller.
import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
} from './auth.controller.js';

const router: Router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);

export default router;