import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { ScoringConfig } from '@prode/shared';

/**
 * Calcula y actualiza los puntos ganados por cada predicción para un partido finalizado.
 * Lee la configuración de puntaje específica del grupo para asignar los puntos de ganador
 * y de resultado exacto correspondientes.
 *
 * @param matchId ID interno del partido en nuestra base de datos.
 */
export async function calculatePointsForMatch(matchId: number): Promise<void> {
  try {
    const match = await db.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      logger.warn(`Intento de calcular puntos para un partido inexistente (ID: ${matchId})`);
      return;
    }

    if (match.status !== 'FINISHED' || !match.result) {
      logger.info(`El partido ${matchId} no ha finalizado o no tiene un resultado cargado. Omitiendo cálculo.`);
      return;
    }

    logger.info(`Calculando puntos para el partido ${matchId} (${match.result})...`);

    // 1. Obtenemos todas las predicciones de este partido que aún no fueron puntuadas (winnerPoints es null)
    const predictions = await db.matchPrediction.findMany({
      where: {
        matchId: match.id,
        winnerPoints: null,
      },
      include: {
        group: true, // Hacemos JOIN con Group para obtener su configuración de puntaje
      },
    });

    logger.info(`Se encontraron ${predictions.length} predicciones pendientes de puntuar.`);

    for (const pred of predictions) {
      // Casteamos la configuración JSON del grupo a la interfaz tipada ScoringConfig
      const scoringConfig = pred.group.scoringConfig as unknown as ScoringConfig;

      let winnerPoints = 0;
      let exactScorePoints = 0;

      // 2. Calculamos los puntos de ganador/empate (HOME_TEAM, AWAY_TEAM, DRAW)
      if (pred.prediction === match.result) {
        winnerPoints = scoringConfig.winnerPrediction.enabled
          ? scoringConfig.winnerPrediction.points
          : 0;
      }

      // 3. Calculamos los puntos de resultado exacto (si está habilitado en el grupo)
      if (scoringConfig.exactScore.enabled) {
        const isExactMatch =
          pred.predictedHomeScore === match.homeScore &&
          pred.predictedAwayScore === match.awayScore;

        exactScorePoints = isExactMatch ? scoringConfig.exactScore.points : 0;
      }

      // 4. Actualizamos la predicción individual
      await db.matchPrediction.update({
        where: { id: pred.id },
        data: {
          winnerPoints,
          exactScorePoints,
        },
      });
    }

    logger.info(`Puntos actualizados con éxito para el partido ${matchId}.`);
  } catch (error: any) {
    logger.error(`Error al calcular puntos para el partido ${matchId}:`, error.message);
    throw error;
  }
}