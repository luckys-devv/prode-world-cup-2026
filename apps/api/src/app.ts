import express, { Express } from 'express';
import cors from 'cors';
// helmet: agrega headers HTTP de seguridad automáticamente.
// Por ejemplo, previene ataques de clickjacking, XSS, y sniffing de MIME type.
// Es como ponerle un casco de seguridad a tu servidor. 🪖
import helmet from 'helmet';
// morgan: loguea cada petición HTTP en la consola.
// En modo 'dev' muestra: GET /health 200 3ms
// En modo 'combined' muestra info completa (IP, user agent, etc.)
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
// Le agregamos ": Express" como tipo explícito para evitar un error de TypeScript
// que ocurre porque el tipo inferido necesita un paquete interno (@types/express-serve-static-core)
// que no está expuesto directamente.
const app: Express = express();

// ─── MIDDLEWARES GLOBALES ──────────────────────────

// Seguridad: agrega headers HTTP protectores a todas las respuestas
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());

// Logger HTTP: muestra en consola cada petición que llega al servidor.
// 'dev' = formato corto y colorido (para desarrollo).
// 'combined' = formato estándar de Apache (para producción/logs).
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── RUTAS ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './modules/auth/auth.routes.js';
import syncRoutes from './modules/sync/sync.routes.js';
import matchesRoutes from './modules/matches/matches.routes.js';
import groupsRoutes from './modules/groups/groups.routes.js';
import invitationsRoutes from './modules/invitations/invitations.routes.js';
import predictionsRoutes from './modules/predictions/predictions.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/admin/sync', syncRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/predictions', predictionsRoutes);

app.use(errorHandler);

export default app;