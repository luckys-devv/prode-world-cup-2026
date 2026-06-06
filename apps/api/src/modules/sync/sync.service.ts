import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { fetchExternalTeams, fetchExternalMatches } from '../matches/football-api.service.js';
import { calculatePointsForMatch } from '../predictions/scoring.service.js';

/**
 * Sincroniza los equipos del Mundial 2026 desde la API externa a la base de datos local.
 */
export async function syncTeams(): Promise<void> {
  const startTime = new Date();
  let status = 'success';
  let details = '';

  try {
    const externalTeams = await fetchExternalTeams();
    logger.info(`Sincronizando ${externalTeams.length} equipos...`);

    // Recorremos los equipos recibidos y los guardamos
    for (const team of externalTeams) {
      await db.team.upsert({
        where: { externalId: team.id },
        update: {
          name: team.name,
          shortName: team.shortName,
          tla: team.tla,
          crestUrl: team.crest,
        },
        create: {
          externalId: team.id,
          name: team.name,
          shortName: team.shortName,
          tla: team.tla,
          crestUrl: team.crest,
        },
      });
    }

    details = `Sincronizados correctamente ${externalTeams.length} equipos.`;
    logger.info(details);
  } catch (error: any) {
    status = 'error';
    details = error.message;
    logger.error('Error durante la sincronización de equipos:', error);
    throw error;
  } finally {
    // Guardamos una auditoría de la sincronización
    await db.syncLog.create({
      data: {
        type: 'teams',
        status,
        details,
        createdAt: startTime,
      },
    });
  }
}

/**
 * Sincroniza los partidos y resultados del fixture de la API externa a la base de datos local.
 */
export async function syncMatches(): Promise<void> {
  const startTime = new Date();
  let status = 'success';
  let details = '';
  let updatedCount = 0;
  let scoredMatchesCount = 0;

  try {
    const externalMatches = await fetchExternalMatches();

    // Obtenemos todos los equipos locales para tener una caché rápida de mapeo (externalId -> id interno)
    const localTeams = await db.team.findMany({
      select: { id: true, externalId: true },
    });

    const teamMap = new Map<number, number>();
    localTeams.forEach((team) => {
      teamMap.set(team.externalId, team.id);
    });

    logger.info(`Sincronizando ${externalMatches.length} partidos...`);

    for (const extMatch of externalMatches) {
      const homeTeamInternalId = teamMap.get(extMatch.homeTeam.id);
      const awayTeamInternalId = teamMap.get(extMatch.awayTeam.id);

      if (!homeTeamInternalId || !awayTeamInternalId) {
        logger.warn(
          `Omitiendo partido externo ${extMatch.id} porque uno de los equipos no está en la BD. ` +
          `Home (extId: ${extMatch.homeTeam.id}) -> intId: ${homeTeamInternalId}, ` +
          `Away (extId: ${extMatch.awayTeam.id}) -> intId: ${awayTeamInternalId}`
        );
        continue;
      }

      // Vemos si ya existe el partido y cuál era su estado anterior
      const existingMatch = await db.match.findUnique({
        where: { externalId: extMatch.id },
        select: { id: true, status: true },
      });

      // Upsert del partido
      const upsertedMatch = await db.match.upsert({
        where: { externalId: extMatch.id },
        update: {
          homeTeamId: homeTeamInternalId,
          awayTeamId: awayTeamInternalId,
          matchDate: new Date(extMatch.utcDate),
          stage: extMatch.stage,
          groupName: extMatch.group,
          matchday: extMatch.matchday,
          status: extMatch.status,
          result: extMatch.score.winner,
          homeScore: extMatch.score.fullTime.home,
          awayScore: extMatch.score.fullTime.away,
        },
        create: {
          externalId: extMatch.id,
          homeTeamId: homeTeamInternalId,
          awayTeamId: awayTeamInternalId,
          matchDate: new Date(extMatch.utcDate),
          stage: extMatch.stage,
          groupName: extMatch.group,
          matchday: extMatch.matchday,
          status: extMatch.status,
          result: extMatch.score.winner,
          homeScore: extMatch.score.fullTime.home,
          awayScore: extMatch.score.fullTime.away,
        },
      });

      updatedCount++;

      // Si el partido está FINISHED externamente pero localmente no estaba en ese estado,
      // se recalculan los puntos de las predicciones de los usuarios.
      if (extMatch.status === 'FINISHED' && (!existingMatch || existingMatch.status !== 'FINISHED')) {
        await calculatePointsForMatch(upsertedMatch.id);
        scoredMatchesCount++;
      }
    }

    details = `Partidos procesados: ${updatedCount}. Nuevos partidos puntuados: ${scoredMatchesCount}.`;
    logger.info(details);
  } catch (error: any) {
    status = 'error';
    details = error.message;
    logger.error('Error durante la sincronización de partidos:', error);
    throw error;
  } finally {
    await db.syncLog.create({
      data: {
        type: 'matches',
        status,
        details,
        createdAt: startTime,
      },
    });
  }
}