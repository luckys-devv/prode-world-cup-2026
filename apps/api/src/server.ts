import app from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { initCronJobs } from './modules/sync/sync.cron.js';

const PORT = env.PORT;

async function bootstrap() {
  try {
    await db.$connect();
    console.log('✅ La conexion va como caniooo.');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📡 Entorno: ${env.NODE_ENV}`);
      initCronJobs();

    });
    server.keepAliveTimeout = 120 * 1000; // 120 segundos
    server.headersTimeout = 125 * 1000; // Siempre mayor a keepalive
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

bootstrap();