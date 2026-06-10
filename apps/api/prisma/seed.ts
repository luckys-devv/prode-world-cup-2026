import { db } from '../src/config/database.js';
import { syncTeams, syncMatches } from '../src/modules/sync/sync.service.js';

async function main() {
  console.log('🌱 Iniciando la siembra (seed) de la base de datos de producción...');
  try {
    await db.$connect();

    console.log('📡 Sincronizando equipos desde football-data.org...');
    await syncTeams();

    console.log('📡 Sincronizando partidos desde football-data.org...');
    await syncMatches();

    console.log('✅ Base de datos sembrada con éxito en producción!');
  } catch (error) {
    console.error('❌ Error durante la siembra (seed):', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();